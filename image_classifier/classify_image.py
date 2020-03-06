#! python
# ===============LICENSE_START=======================================================
# Acumos Apache-2.0
# ===================================================================================
# Copyright (C) 2017-2018 AT&T Intellectual Property & Tech Mahindra. All rights reserved.
# ===================================================================================
# This Acumos software file is distributed by AT&T and Tech Mahindra
# under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# This file is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ===============LICENSE_END=========================================================
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
    from _version import __version__

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
    image_type = tuple(zip(df.columns, ImageDecoder.generate_input_types()))
    name_in = "Image"
    input_image = create_namedtuple(name_in, image_type)

    # output of clasifier, list of tags
    df = Formatter.generate_output_dataframe()
    tag_result = tuple(zip(df.columns, Formatter.generate_output_types()))
    name_out = "ImageTag"
    ImageTag = create_namedtuple(name_out, tag_result)
    output_set = create_namedtuple(name_out + "Set", [(name_out + "s", List[ImageTag])])

    def predict_class(val_wrapped: input_image) -> output_set:
        '''Returns an array of float predictions'''
        # NOTE: we don't have a named output type, so need to match 'value' to proto output
        # print("-===== input -===== ")
        # print(input_set)
        df = pd.DataFrame([val_wrapped], columns=input_image._fields)
        # print("-===== df -===== ")
        # print(df)
        # print("-===== out df -===== ")
        tags_df = pipeline.predict(df)
        # print(tags_df)
        tags_parts = tags_df.to_dict('split')
        # print("-===== out list -===== ")
        # print(output_set)
        tags_list = [ImageTag(*r) for r in tags_parts['data']]
        print("[{} - {}:{}]: Input {} row(s) ({}), output {} row(s) ({}))".format(
              "classify", MODEL_NAME, __version__, len(df), input_image, len(tags_df), output_set))
        return output_set(tags_list)

    # compute path of this package to add it as a dependency
    package_path = path.dirname(path.realpath(__file__))
    return Model(classify=predict_class), Requirements(packages=[package_path], reqs=[pd, np, keras, 'tensorflow', 'Pillow'])


def create_sample(path_image, input_type="image/jpeg"):
    # from image_classifier.keras_model.image_decoder import ImageDecoder
    # munge stream and mimetype into input sample
    binStream = open(path_image, 'rb').read()
    return (input_type, binStream)


def keras_evaluate(config):
    taskComplete = False
    useSklearn = True
    model = None

    if useSklearn:
        # formulate the pipelien to be used
        from image_classifier.keras_model.prediction_formatter import Formatter
        model, reqs = model_create_pipeline(config['model_path'], config['label_path'],
                                            config['num_top_predictions'])

        if 'dump_model' in config and config['dump_model']:
            from acumos.session import AcumosSession
            from os import makedirs
            if not os.path.exists(config['dump_model']):
                makedirs(config['dump_model'])
            print("Dumping new model to '{:}'...".format(config['dump_model']))
            session = AcumosSession()
            session.dump(model, MODEL_NAME, config['dump_model'], reqs)  # creates ./my-iris.zip
            taskComplete = True

        if 'push_address' in config and config['push_address']: # and 'auth_address' in config and config['push_address']:
            from acumos.session import AcumosSession,Options

            if config['create_microservice']=='False' :
                if config['license_path'] is not 'None' :
                    opts=Options(create_microservice=False,license=config['license_path'])
                else :
                    opts=Options(create_microservice=False)

            if config['create_microservice']=='True' :
                if config['license_path'] is not 'None' :
                    opts=Options(create_microservice=True,license=config['license_path'])
                else :
                    opts=Options(create_microservice=True)

            session = AcumosSession(push_api=config['push_address']) #, auth_api=config['auth_address'])
            print("Pushing new model to '{:}'".format(config['push_address'])) #,auth '{:}'...".format(config['push_address'], config['auth_address']))
            session.push(model, MODEL_NAME, reqs, options=opts)
            taskComplete = True

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

    preds = None
    if model and not taskComplete:   # means we need to run a prediction/classify
        if not os.path.exists(config['image']) and (config['image_list'] and not os.path.exists(config['image_list'])):
            print("The target image/list '{}'/'{}' was not found, please check input arguments.".format(config['image'], config['image_list']))
            sys.exit(-1)

        listImages = []
        if config['image_list']:  # provided a list to run with?
            dfImages = pd.read_csv(config['image_list'], header=None, names=['file'], delimiter=",")
            listImages = dfImages['file'].tolist()

        if len(listImages) == 0:   # make a list if just one item
            listImages = [config['image']]

        wrapped_model = model  # 5/31/18, simplify to reuse already created model
        type_in = wrapped_model.classify.input_type

        for idx in range(len(listImages)):
            curImage = listImages[idx]
            print("Attempting classification of image [{:}]: {:}...".format(idx, curImage))

            X = create_sample(curImage)
            classify_in = type_in(*X)
            pred_raw = wrapped_model.classify.wrapped(classify_in)
            if len(pred_raw._fields) == 1:  # type is nested?, go down one level
                pred_raw = getattr(pred_raw, pred_raw._fields[0])
            # already a wrapped response
            predNew = pd.DataFrame(pred_raw)
            predNew[Formatter.COL_NAME_IDX] = idx
            if preds is None:
                preds = predNew
            else:
                preds = preds.append(predNew, ignore_index=True)
        preds.reset_index(drop=True, inplace=True)

    return preds


def main(config={}):
    import argparse
    parser = argparse.ArgumentParser()
    submain = parser.add_argument_group('main execution and evaluation functionality')
    submain.add_argument('-m', '--model_path', type=str, default='model.h5', help="Path to read and store image model. (created if not provided)")
    submain.add_argument('-i', '--image', type=str, default='', help='Absolute path to image file. (for now must be a jpeg)')
    submain.add_argument('-I', '--image_list', type=str, default='', help='To batch process multiple images in one load')
    submain.add_argument('-p', '--predict_path', type=str, default='', help="Optional place to save intermediate predictions from model")
    subopts = parser.add_argument_group('model creation and configuration options')
    subopts.add_argument('-f', '--framework', type=str, default='keras', help='Underlying framework to utilize', choices=['keras', 'tensorflow'])
    subopts.add_argument('-C', '--cuda_env', type=str, default='', help='Anything special to inject into CUDA_VISIBLE_DEVICES environment string')
    submain.add_argument('-l', '--label_path', type=str, default='data/keras_class_names.txt', help="Path to class label file for output columns, unnamed if empty (i.e. data/keras_class_names.txt).")
    subopts.add_argument('-n', '--num_top_predictions', type=int, default=30, help='Display this many predictions. (0=disable)')
    subopts.add_argument('-a', '--push_address', help='server address to push the model (e.g. http://localhost:8887/v2/upload)', default=os.getenv('ACUMOS_PUSH', ""))
    subopts.add_argument('-s', '--create_microservice', type=str, default='True',help='start the microservice generation at the end of on-boarding or not (True/False)')
    subopts.add_argument('-t', '--license_path', type=str, default='None',help='Absolute path to the license file')
    #subopts.add_argument('-A', '--auth_address', help='server address for login and push of the model (e.g. http://localhost:8887/v2/auth)', default=os.getenv('ACUMOS_AUTH', ""))
    subopts.add_argument('-d', '--dump_model', help='dump model to a directory for local running', default='')
    config.update(vars(parser.parse_args()))  # pargs, unparsed = parser.parse_known_args()

    microservice_value=['True', 'False']

    try:
       assert config['create_microservice'] in microservice_value
    except AssertionError:
       raise ValueError("create_microservice is a boolean parameter please fill it with True or False")

    if config['framework'] != 'keras':
        print("Sorry, at this time only the 'keras' framework is supported.")
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
    import os
    # patch the path to include this object
    pathRoot = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if pathRoot not in sys.path:
        sys.path.append(pathRoot)
    main()
