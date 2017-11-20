#! python
# -*- coding: utf-8 -*-
"""
Wrapper for image classification task using keras or tensorflow
"""

import os.path
import sys

import numpy as np
import pandas as pd

MODEL_NAME = 'image_classifier'


def model_create_pipeline(path_model, path_label, top_n):
    from sklearn.pipeline import Pipeline
    import keras
    from image_classifier.keras_model.prediction_formatter import Formatter
    from image_classifier.keras_model.evaluate_image import Predictor
    from image_classifier.keras_model.image_decoder import ImageDecoder
    from acumos.modeling import Model, List, create_namedtuple
    from acumos.session import Requirements
    from os import path

    # read dictionary to pass along to formatter class
    dict_classes = eval(open(path_label, 'r').read()) if path_label else None

    # we will create a hybrid keras/scikit pipeline because we need some preprocessing done
    #   within scikit that is not easily posisble with keras
    #
    # stages are as follows (the quoted section is the scikit pipeline name)
    #   #1 'decode' - input+reshape - decode incoming image with MIME+BINARY as inputs
    #   #2 'predict' - prediction - input the transformed image to the prediction method
    #   #3 'format' - predict transform - post-process the predictions into sorted prediction classes
    # see this page for hints about what happens...
    #   https://stackoverflow.com/questions/37984304/how-to-save-a-scikit-learn-pipline-with-keras-regressor-inside-to-disk
    #
    # NOTE: the last object is an "estimator" type so that we can call "predict", as required by the
    #       acumos-based wrapper functionality
    pipeline = Pipeline([
        ('decode', ImageDecoder()),
        ('predict', Predictor(path_model=path_model)),
        ('format', Formatter(dict_classes, top_n))
    ])

    # create a dataframe and image set
    # ImageSet = create_dataframe("ImageSet", ImageDecoder.generate_input_dataframe())
    # TODO: replace with more friendly dataframe operation when it supoprts strings...
    df = ImageDecoder.generate_input_dataframe()
    image_type = tuple(zip(df.columns, [List[t] for t in ImageDecoder.generate_input_types()]))
    ImageSet = create_namedtuple("ImageSet", image_type)
    # output of clasifier, list of tags
    df = Formatter.generate_output_dataframe()
    tag_type = tuple(zip(df.columns, [List[t] for t in Formatter.generate_output_types()]))
    ImageTagSet = create_namedtuple("ImageTagSet", tag_type)

    def predict_class(wrapped_imageset: ImageSet) -> ImageTagSet:
        '''Returns an array of float predictions'''
        # NOTE: we don't have a named output type, so need to match 'value' to proto output
        df = pd.DataFrame(np.column_stack(wrapped_imageset), columns=wrapped_imageset._fields)
        tags_df = pipeline.predict(df)
        tags_list = ImageTagSet(*(col for col in tags_df.values.T))  # flatten to tag set
        return tags_list

    # compute path of this package to add it as a dependency
    package_path = path.dirname(path.realpath(__file__))
    return Model(classify=predict_class), Requirements(packages=[package_path], reqs=[pd, np, keras, 'tensorflow'])


def create_sample(path_image, input_type="image/jpeg"):
    from image_classifier.keras_model.image_decoder import ImageDecoder
    # munge stream and mimetype into input sample
    binStream = open(path_image, 'rb').read()
    return ImageDecoder.generate_input_dataframe(input_type, binStream)


def keras_evaluate(config):
    taskComplete = False
    useSklearn = True
    listImages = []

    if 'image_list' in config and config['image_list']:
        dfImages = pd.read_csv(config['image_list'], header=None, names=['file'], delimiter=",")
        listImages = dfImages['file'].tolist()
        config['image'] = listImages[0]
    X = create_sample(config['image'])

    if useSklearn:
        # formulate the pipelien to be used
        from image_classifier.keras_model.prediction_formatter import Formatter
        model, reqs = model_create_pipeline(config['model_path'], config['label_path'],
                                            config['num_top_predictions'])

        if 'push_address' in config and 'auth_address' in config and config['push_address']:
            from acumos.session import AcumosSession
            session = AcumosSession(push_api=config['push_address'], auth_api=config['auth_address'])
            print("Pushing new model to upload '{:}', auth '{:}'...".format(config['push_address'], config['auth_address']))
            session.push(model, MODEL_NAME, reqs)  # creates ./my-iris.zip
            taskComplete = True

        if 'dump_model' in config and config['dump_model']:
            from acumos.session import AcumosSession
            from os import makedirs
            if not os.path.exists(config['dump_model']):
                makedirs(config['dump_model'])
            print("Dumping new model to '{:}'...".format(config['dump_model']))
            session = AcumosSession()
            session.dump(model, MODEL_NAME, config['dump_model'], reqs)  # creates ./my-iris.zip
            taskComplete = True

        preds = None
        if not taskComplete:   # means we need to run a prediction/classify
            import tempfile
            from acumos.session import _dump_model, _copy_dir
            from os.path import join as path_join
            from acumos.wrapped import load_model

            if not listImages:
                listImages = [config['image']]
            preds = None

            # temporarily wrap model to a temp directory (to get 'wrapped' functionality)
            with tempfile.TemporaryDirectory() as tdir:   # create temp dir
                with _dump_model(model, MODEL_NAME, reqs) as dump_dir:  # dump model to temp dir
                    _copy_dir(dump_dir, tdir, MODEL_NAME)   # relocate for load_model below

                model_dir = path_join(tdir, MODEL_NAME)
                wrapped_model = load_model(model_dir)  # load to wrapped model
                type_in = wrapped_model.classify._input_type

                for idx in range(len(listImages)):
                    curImage = listImages[idx]
                    print("Attempting classification of image [{:}]: {:}...".format(idx, curImage))

                    X = create_sample(curImage)
                    classify_in = type_in(*tuple(col for col in X.values.T))
                    pred_raw = wrapped_model.classify.from_wrapped(classify_in).as_wrapped()
                    # already a wrapped response
                    predNew = pd.DataFrame(np.column_stack(pred_raw), columns=pred_raw._fields)
                    predNew[Formatter.COL_NAME_IDX] = idx
                    if preds is None:
                        preds = predNew
                    else:
                        preds = preds.append(predNew, ignore_index=True)
                preds.reset_index(drop=True, inplace=True)

    """
    Disable non-sklearn path for now
    else:
        from image_classifier.keras import inception_v4
        from image_classifier.keras.image_decoder import ImageDecoder

        # Load test image!
        img = ImageDecoder.get_processed_image_keras_file(config['image'])  # load image through keras
        # img = evaluate_image.get_processed_image_cv(config['image'])

        # Run prediction on test image
        model, model_path = inception_v4.create_model(weights='imagenet', include_top=True, model_path=model_path)
        preds = model.predict(img)
    """

    return preds


def main(config={}):
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('-m', '--model_path', type=str, default='', help="Path to read and store image model.")
    parser.add_argument('-l', '--label_path', type=str, default='', help="Path to class label file, unnamed if empty (i.e. data/keras_class_names.txt).")
    parser.add_argument('-p', '--predict_path', type=str, default='', help="Optional place to save intermediate predictions from model (if provided, skips model call)")
    parser.add_argument('-i', '--image', type=str, default='', help='Absolute path to image file. (for now must be a jpeg)')
    parser.add_argument('-I', '--image_list', type=str, default='', help='To batch process multiple images in one load')
    parser.add_argument('-f', '--framework', type=str, default='keras', help='Underlying framework to utilize', choices=['keras', 'tensorflow'])
    parser.add_argument('-C', '--cuda_env', type=str, default='', help='Anything special to inject into CUDA_VISIBLE_DEVICES environment string')
    parser.add_argument('-n', '--num_top_predictions', type=int, default=30, help='Display this many predictions. (0=disable)')
    parser.add_argument('-a', '--push_address', help='server address to push the model (e.g. http://localhost:8887/v2/upload)', default='')
    parser.add_argument('-A', '--auth_address', help='server address for login and push of the model (e.g. http://localhost:8887/v2/auth)', default='')
    parser.add_argument('-d', '--dump_model', help='dump model to a pickle directory for local running', default='')
    config.update(vars(parser.parse_args()))  # pargs, unparsed = parser.parse_known_args()

    if config['framework'] != 'keras':
        print("Sorry, at this time only the 'keras' framework is supported.")
        sys.exit(-1)
    if not os.path.exists(config['image']) and not config['image_list']:
        print("The target image '{:}' was not found, please check input arguments.".format(config['image']))
        sys.exit(-1)

    # If you want to use a GPU set its index here
    if config['cuda_env']:
        os.environ['CUDA_VISIBLE_DEVICES'] = config['cuda_env']

    dfPred = pd.DataFrame()
    if config['framework'] == 'keras':
        dfPred = keras_evaluate(config)
    if config['predict_path']:
        dfPred.to_csv(config['predict_path'], sep=',', index=False)

    if dfPred is not None:
        print("Predictions:\n{:}".format(dfPred))
    # print("Certainty is: " + str(preds[0][np.argmax(preds)]))


if __name__ == '__main__':
    import os, sys
    # patch the path to include this object
    pathRoot = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if pathRoot not in sys.path:
        sys.path.append(pathRoot)
    main()
