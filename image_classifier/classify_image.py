#! python
# -*- coding: utf-8 -*-
"""
Wrapper for image classification task using keras or tensorflow 
"""

import os.path
import sys

import numpy as np


def model_create_pipeline(path_model, path_label):
    from sklearn.pipeline import Pipeline
    from image_classifier.keras.prediction_formatter import Formatter
    from image_classifier.keras.evaluate_image import Predictor
    from image_classifier.keras.image_decoder import ImageDecoder

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
        ('format', Formatter(dict_classes))
    ])
    return pipeline

def keras_evaluate(config):
    taskComplete = False
    useSklearn = True
    if useSklearn:
        pipeline = model_create_pipeline(config['model_path'], config['label_path'])
        if config.push_address:
            taskComplete = True
        if config.dump_model:
            taskComplete = True
        if not taskComplete:
            #pipeline.fit(X_train, y_train)
            binStream = open(config['image'], 'rb').read()
            preds = pipeline.predict(['image/jpeg', binStream])
            #print(preds)

            # # Save the Keras model first:
            # pipeline.named_steps['estimator'].model.save('keras_model.h5')
            #
            # # This hack allows us to save the sklearn pipeline:
            # pipeline.named_steps['estimator'].model = None
            #
            # # Finally, save the pipeline:
            # joblib.dump(pipeline, 'sklearn_pipeline.pkl')
            #
            # del pipeline

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



def main():
    import argparse
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


    if not config['predict_path'] or not os.path.exists(config['predict_path']):
        # todo: add other languages and frameworks when available?
        if config['framework'] == 'keras':
            dfPred = keras_evaluate(config)
        if config['predict_path']:
            np.savetxt(config['predict_path'], preds, delimiter=",")
    else:
        preds = np.loadtxt(config['predict_path'], delimiter=",")

        # todo: add other languages and frameworks when available?
        if config['framework'] == 'keras':
            from image_classifier.keras.prediction_formatter import Formatter
            dfPred = Formatter.prediction_transform(preds, None, config['label_path'])

    print("Predictions:\n{:}".format(dfPred[:config['num_top_predictions']]))
    #print("Certainty is: " + str(preds[0][np.argmax(preds)]))

if __name__ == '__main__':
    main()
