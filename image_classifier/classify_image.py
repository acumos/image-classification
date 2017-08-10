#! python
# -*- coding: utf-8 -*-
"""
Wrapper for image classification task using keras or tensorflow 
"""

import argparse
import os.path
import pandas as pd
import sys

import numpy as np


def keras_evaluate(config):
    from image_classifier.keras import evaluate_image
    import shutil

    im = evaluate_image.get_processed_image_keras(config['image'])  # load image through keras

    # default to just 'model.h5' for keras
    if not config['model_path']:
        config['model_path'] = 'model.h5'

    # Create model and load pre-trained weights
    model_path = config['model_path']
    if not config['model_path'] or not os.path.exists(config['model_path']):
        print("Warning: The target model '{:}' was not found, attempting to download archived library.".format(config['model_path']))
        model_path = None
    model, model_path = evaluate_image.inception_v4.create_model(weights='imagenet', include_top=True, model_path=model_path)

    # if we downlaoded a model, move it to model_path
    if model_path!=config['model_path'] and os.path.exists(model_path):
        shutil.move(model_path, config['model_path']) # move into directory

    # Load test image!
    img = evaluate_image.get_processed_image_keras(config['image'])
    # import pickle
    # pickle.dump(img, open("img_keras.csv", 'wb'))

    # img = evaluate_image.get_processed_image_cv(config['image'])
    # pickle.dump(img, open("img_cv2.csv", 'wb'))

    # Run prediction on test image
    preds = model.predict(img)
    return preds


def prediction_transform(preds, config):
    df = pd.DataFrame(preds.transpose(), columns=['probability'])
    if config['label_path']:        # Open Class labels dictionary. (human readable label given ID)
        dictClasses = eval(open(config['label_path'], 'r').read())
        listClasses = [dictClasses[ix-1] for ix in list(df.index)]  # NOTE: special -1 offset
        df.insert(0, 'class', listClasses)
    else:
        df.insert(0, 'class', ['class_{:}'.format(idx) for idx in range(len(preds))])

    #print("Class is: " + classes[np.argmax(preds) - 1])
    df.sort_values(['probability'], ascending=False, inplace=True)
    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-m', '--model_path', type=str, default='', help="Path to read and store image model.")
    parser.add_argument('-l', '--label_path', type=str, default='', help="Path to class label file, unnamed if empty (i.e. data/keras_class_names.txt).")
    parser.add_argument('-p', '--predict_path', type=str, default='', help="Optional place to save intermediate predictions from model (if provided, skips model call)")
    parser.add_argument('-i', '--image', type=str, default='',help='Absolute path to image file.')
    parser.add_argument('-f', '--framework', type=str, default='keras',help='Underlying framework to utilize', choices=['keras', 'tensorflow'])
    parser.add_argument('-C', '--cuda_env', type=str, default='',help='Anything special to inject into CUDA_VISIBLE_DEVICES environment string')
    parser.add_argument('-n', '--num_top_predictions', type=int, default=5, help='Display this many predictions.')
    parser.add_argument('-a', '--push_address', help='server address to push the model (e.g. http://localhost:8887/v1/models)', default='')
    parser.add_argument('-d', '--dump_model', help='dump model to a pickle directory for local running', default='')
    config = vars(parser.parse_args())     #pargs, unparsed = parser.parse_known_args()

    if config['framework']!='keras':
        print("Sorry, at this time only the 'keras' framework is supported.")
        sys.exit(-1)
    if not os.path.exists(config['image']):
        print("The target image '{:}' was not found, please check input arguments.".format(config['image']))
        sys.exit(-1)

    # If you want to use a GPU set its index here
    if config['cuda_env']:
        os.environ['CUDA_VISIBLE_DEVICES'] = config['cuda_env']

    # todo: add other languages and frameworks when available?
    if not config['predict_path'] or not os.path.exists(config['predict_path']):
        preds = keras_evaluate(config)
        if config['predict_path']:
            np.savetxt(config['predict_path'], preds, delimiter=",")
    else:
        preds = np.loadtxt(config['predict_path'], delimiter=",")

    dfPred = prediction_transform(preds, config)
    print("Predictions:\n{:}".format(dfPred[:config['num_top_predictions']]))
    #print("Certainty is: " + str(preds[0][np.argmax(preds)]))

if __name__ == '__main__':
    main()
