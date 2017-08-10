# image-classification
A model example for image classification within Cognita.

## Image Classification Keras Use-case (Cognita)
This source code creates and pushes a model into Cognita that processes
incoming images and outputs a number of classification probability values.
This model utilizes the pretrained network from [keras inception v4](https://github.com/kentsommer/keras-inceptionV4)
and utilizes the [pretrained keras model](https://github.com/kentsommer/keras-inceptionV4/releases).
At time of writing, this sample does not support retraining.

### Usage
TBD




## Image Classification Tensorflow Use-case (Cognita)
This source code creates and pushes a model into Cognita that processes
incoming images and outputs a number of classification probability values.
This model uses the pretrained network from [inception_v3](http://download.tensorflow.org/models/image/imagenet/inception-2015-12-05.tgz) and closely
follows the [image classification example](https://tensorflow.org/tutorials/image_recognition/)
provided as part of the tensorflow documentation.

### Usage
TBD

# Example Interface
An instance should first be built and downloaded from Cognita and then
launched locally.  Afterwards, the sample application found in 
[web_demo](web_demo) uses a `localhost` service to classify
and visualize the results of image classification.
