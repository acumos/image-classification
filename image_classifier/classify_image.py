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
    import keras
    dependent_modules = [keras, pd, np]  # define as dependent libraries


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
    #       cognita-based wrapper functionality
    pipeline = Pipeline([
        ('decode', ImageDecoder()),
        ('predict', Predictor(path_model)),
        ('format', Formatter(dict_classes, top_n))
    ])
    return pipeline, dependent_modules

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
        pipeline, EXTRA_DEPS = model_create_pipeline(config['model_path'], config['label_path'],
                                                     config['num_top_predictions'])

        if 'push_address' in config and config['push_address']:
            from cognita_client.push import push_skkeras_hybrid_model
            print("Pushing new model to '{:}'...".format(config['push_address']))
            push_skkeras_hybrid_model(pipeline, X, api=config['push_address'], name=MODEL_NAME, extra_deps=EXTRA_DEPS)
            taskComplete = True

        if 'dump_model' in config and config['dump_model']:
            from cognita_client.wrap.dump import dump_skkeras_hybrid_model
            print("Dumping new model to '{:}'...".format(config['dump_model']))
            dump_skkeras_hybrid_model(pipeline, X, config['dump_model'], name=MODEL_NAME, extra_deps=EXTRA_DEPS)
            taskComplete = True

        preds = None
        if not taskComplete:
            if not listImages:
                listImages = [ config['image'] ]
            preds = None
            for idx in range(len(listImages)):
                curImage = listImages[idx]
                X = create_sample(curImage)
                print("Attempting classification of image {:}...".format(curImage))
                predNew = pipeline.predict(X)
                predNew['idx'] = idx
                if preds is None:
                    preds = predNew
                else:
                    preds = preds.append(predNew, ignore_index=True)
            preds.reset_index(drop=True, inplace=True)

    else:
        from image_classifier.keras import inception_v4
        from image_classifier.keras.image_decoder import ImageDecoder

        # Load test image!
        img = ImageDecoder.get_processed_image_keras_file(config['image'])  # load image through keras
        # img = evaluate_image.get_processed_image_cv(config['image'])

        # Run prediction on test image
        model, model_path = inception_v4.create_model(weights='imagenet', include_top=True, model_path=model_path)
        preds = model.predict(img)

    return preds



def main(config={}):
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('-m', '--model_path', type=str, default='', help="Path to read and store image model.")
    parser.add_argument('-l', '--label_path', type=str, default='', help="Path to class label file, unnamed if empty (i.e. data/keras_class_names.txt).")
    parser.add_argument('-p', '--predict_path', type=str, default='', help="Optional place to save intermediate predictions from model (if provided, skips model call)")
    parser.add_argument('-i', '--image', type=str, default='',help='Absolute path to image file. (for now must be a jpeg)')
    parser.add_argument('-I', '--image_list', type=str, default='',help='To batch process multiple images in one load')
    parser.add_argument('-f', '--framework', type=str, default='keras',help='Underlying framework to utilize', choices=['keras', 'tensorflow'])
    parser.add_argument('-C', '--cuda_env', type=str, default='',help='Anything special to inject into CUDA_VISIBLE_DEVICES environment string')
    parser.add_argument('-n', '--num_top_predictions', type=int, default=30, help='Display this many predictions. (0=disable)')
    parser.add_argument('-a', '--push_address', help='server address to push the model (e.g. http://localhost:8887/v2/models)', default='')
    parser.add_argument('-d', '--dump_model', help='dump model to a pickle directory for local running', default='')
    config.update(vars(parser.parse_args()))     #pargs, unparsed = parser.parse_known_args()


    if config['framework']!='keras':
        print("Sorry, at this time only the 'keras' framework is supported.")
        sys.exit(-1)
    if not os.path.exists(config['image']) and not config['image_list']:
        print("The target image '{:}' was not found, please check input arguments.".format(config['image']))
        sys.exit(-1)

    # If you want to use a GPU set its index here
    if config['cuda_env']:
        os.environ['CUDA_VISIBLE_DEVICES'] = config['cuda_env']

    if not config['predict_path'] or not os.path.exists(config['predict_path']):
        # todo: add other languages and frameworks when available?
        if config['framework'] == 'keras':
            dfPred = keras_evaluate(config)
        if config['predict_path']:
            dfPred.to_csv(config['predict_path'], sep=',')

    if dfPred is not None:
        print("Predictions:\n{:}".format(dfPred))
    #print("Certainty is: " + str(preds[0][np.argmax(preds)]))

if __name__ == '__main__':
    main()
