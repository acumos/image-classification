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
    from image_classifier.keras.prediction_formatter import Formatter
    from image_classifier.keras.evaluate_image import Predictor
    from image_classifier.keras.image_decoder import ImageDecoder
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

    # no other pipeline steps required here...
    ImageRow = create_namedtuple('ImageInput', [('mime_type', str), ('image_binary', bytes)])
    # represents a collection of flattened image arrays
    ImageSet = List[ImageRow]
    # output of clasifier, list of tags
    ImageTag = create_namedtuple('ImageTag', [('image', int), ('tag', str), ("score", float)])

    def predict_class(value: ImageSet) -> List[ImageTag]:
        '''Returns an array of float predictions'''
        # NOTE: we don't have a named output type, so need to match 'value' to proto output
        if type(value) == pd.DataFrame:
            df = value
        else:
            df = pd.DataFrame(value)
        tags_df = pipeline.predict(df)
        tags_list = [ImageTag(*row) for row in tags_df.values]  # iterate over rows and unpack row into ImageTag
        return tags_list

    # compute path of this package to add it as a dependency
    package_path = path.dirname(path.realpath(__file__))
    return Model(classify=predict_class), Requirements(packages=[package_path], reqs=[pd, np, 'keras', 'tensorflow'])


def create_sample(path_image):
    # munge stream and mimetype into input sample
    binStream = open(path_image, 'rb').read()
    X = pd.DataFrame([['image/jpeg', binStream]], columns=['mime_type', 'binary_stream'])
    return X


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
        from image_classifier.keras.prediction_formatter import Formatter
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
        if not taskComplete:
            if not listImages:
                listImages = [config['image']]
            preds = None
            for idx in range(len(listImages)):
                curImage = listImages[idx]
                X = create_sample(curImage)
                print("Attempting classification of image [{:}]: {:}...".format(idx, curImage))
                predNew = pd.DataFrame(model.classify.inner(X))
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
    main()
