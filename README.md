# image-classification
A model example for image classification within Cognita.

## Image Classification Keras Use-case (Cognita)
This source code creates and pushes a model into Cognita that processes
incoming images and outputs a number of classification probability values.
This model utilizes the pretrained network from [keras inception v4](https://github.com/kentsommer/keras-inceptionV4)
and utilizes the [pretrained keras model](https://github.com/kentsommer/keras-inceptionV4/releases).
At time of writing, this sample does not support retraining.

### Usage
This package contains runable scripts for command-line evaluation,
packaging of a model (both dump and posting), and simple web-test
uses.   All functionality is encapsulsted in the `classify_image.py`
script and has the following arguments.

```
usage: run_image-classifier_reference.py [-h] [-m MODEL_PATH] [-l LABEL_PATH]
                                         [-p PREDICT_PATH] [-i IMAGE]
                                         [-f {keras,tensorflow}] [-C CUDA_ENV]
                                         [-n NUM_TOP_PREDICTIONS]
                                         [-a PUSH_ADDRESS] [-d DUMP_MODEL]

optional arguments:
  -h, --help            show this help message and exit
  -m MODEL_PATH, --model_path MODEL_PATH
                        Path to read and store image model.
  -l LABEL_PATH, --label_path LABEL_PATH
                        Path to class label file, unnamed if empty (i.e.
                        data/keras_class_names.txt).
  -p PREDICT_PATH, --predict_path PREDICT_PATH
                        Optional place to save intermediate predictions from
                        model (if provided, skips model call)
  -i IMAGE, --image IMAGE
                        Absolute path to image file.
  -f {keras,tensorflow}, --framework {keras,tensorflow}
                        Underlying framework to utilize
  -C CUDA_ENV, --cuda_env CUDA_ENV
                        Anything special to inject into CUDA_VISIBLE_DEVICES
                        environment string
  -n NUM_TOP_PREDICTIONS, --num_top_predictions NUM_TOP_PREDICTIONS
                        Display this many predictions. (0=disable)
  -a PUSH_ADDRESS, --push_address PUSH_ADDRESS
                        server address to push the model (e.g.
                        http://localhost:8887/v2/models)
  -d DUMP_MODEL, --dump_model DUMP_MODEL
                        dump model to a pickle directory for local running

```


### Examples
Example for evaluation of a test image with top 5 results.
```
/bin/run_local.sh -m model.h5 -i data/model-t.jpg -f keras -l data/keras_class_names.txt -n 5
```




## Image Classification Tensorflow Use-case (Cognita)
This source code creates and pushes a model into Cognita that processes
incoming images and outputs a number of classification probability values.
This model uses the pretrained network from [inception_v3](http://download.tensorflow.org/models/image/imagenet/inception-2015-12-05.tgz) and closely
follows the [image classification example](https://tensorflow.org/tutorials/image_recognition/)
provided as part of the tensorflow documentation.

### Usage
*This use case is currently omitted and the image classification
utility is provided by a keras-build tensorflow model. However, the
lessons for creating a hybrid keras model are applicable to the tensorflow
patterns.*

# Example Interface
An instance should first be built and downloaded from Cognita and then
launched locally.  Afterwards, the sample application found in 
[web_demo](web_demo) uses a `localhost` service to classify
and visualize the results of image classification.
