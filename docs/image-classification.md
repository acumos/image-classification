<!---
.. ===============LICENSE_START=======================================================
.. Acumos CC-BY-4.0
.. ===================================================================================
.. Copyright (C) 2017-2018 AT&T Intellectual Property & Tech Mahindra. All rights reserved.
.. ===================================================================================
.. This Acumos documentation file is distributed by AT&T and Tech Mahindra
.. under the Creative Commons Attribution 4.0 International License (the "License");
.. you may not use this file except in compliance with the License.
.. You may obtain a copy of the License at
..
..      http://creativecommons.org/licenses/by/4.0
..
.. This file is distributed on an "AS IS" BASIS,
.. WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
.. See the License for the specific language governing permissions and
.. limitations under the License.
.. ===============LICENSE_END=========================================================
-->

# Image Classification Guide
A model example for image classification with a Keras wrapper within Acumos.

## Background
This model analyzes static images and produces a probability for a number of
objects, scene, and activity tags.  It is a Keras-based wrapper around a
visual model trained for [Inception Net](https://github.com/google/inception)
and this source code creates and pushes
a model into Acumos.  This model utilizes the pre-trained network from
[keras inception v4](https://github.com/kentsommer/keras-inceptionV4)
and utilizes the
[pretrained keras model](https://github.com/kentsommer/keras-inceptionV4/releases).
At time of writing,
this sample does not support retraining.

## Usage
Input to the model is an array of one or more tuples of image binary data and
a binary mime type.  The position of the image within the array is utilized
in the output signature as a zero-based index.  For example if three images
were sent, the output probabilities would have 0, 1, and 2 as index values.
The probabilities are normalized to sum to 1.0 over all values so that they

can utilized as relative confidence scores.
A web demo is included with the source code, available via the
[Acumos Gerrit repository](https://gerrit.acumos.org/r/gitweb?p=image-classification.git;a=summary) or
the mirrored [Acumos Github repository](https://github.com/acumos/image-classification).
It utilizes a protobuf javascript library and inputs captured frames
from a few video samples to classify and display the top N detected
classification scores, as illustrated in the model image.

## Performance
Formal performance is not provided here because this is a wrapped, pre-generated
model, but the original authors point to
[these sources for information](https://github.com/kentsommer/keras-inceptionV4#performance-metrics-top5-top1).

Error rates are actually slightly lower than the listed error rates on
non-blacklisted subset of ILSVRC2012 Validation Dataset (Single Crop):
* Top@1 Error: 20.0%
* Top@5 Error: 5.0%

## More Information
Enhancements to this model may include additional training capabilities or
adaptation to new model weights (and classes) when available.

# Source Installation
This section is useful for source-based installations and is not generally intended
for catalog documentation.

## Package dependencies
Package dependencies for the core code and testing have been flattened into a
single file for convenience. Instead of installing this package into your
your local environment, execute the command below.

**Note:** If you are using an [anaconda-based environment](https://anaconda.org),
you may want to try installing with conda first and then pip.
to mixing mixing package stores.
```
conda install --yes --file requirements.txt  # suggested first step if you're using conda
```

Installation of the package requirements for a new environment.
```
pip install -r requirements.txt
```


## Usage
This package contains runable scripts for command-line evaluation,
packaging of a model (both dump and posting), and simple web-test
uses.   All functionality is encapsulsted in the `classify_image.py`
script and has the following arguments.

```
usage: classify_image.py [-h] [-m MODEL_PATH] [-i IMAGE] [-I IMAGE_LIST]
                         [-p PREDICT_PATH] [-f {keras,tensorflow}]
                         [-C CUDA_ENV] [-l LABEL_PATH]
                         [-n NUM_TOP_PREDICTIONS] [-a PUSH_ADDRESS]
                         [-A AUTH_ADDRESS] [-d DUMP_MODEL]

optional arguments:
  -h, --help            show this help message and exit

main execution and evaluation functionality:
  -m MODEL_PATH, --model_path MODEL_PATH
                        Path to read and store image model. (created if not
                        provided)
  -i IMAGE, --image IMAGE
                        Absolute path to image file. (for now must be a jpeg)
  -I IMAGE_LIST, --image_list IMAGE_LIST
                        To batch process multiple images in one load
  -p PREDICT_PATH, --predict_path PREDICT_PATH
                        Optional place to save intermediate predictions from
                        model
  -l LABEL_PATH, --label_path LABEL_PATH
                        Path to class label file for output columns, unnamed
                        if empty (i.e. data/keras_class_names.txt).

model creation and configuration options:
  -f {keras,tensorflow}, --framework {keras,tensorflow}
                        Underlying framework to utilize
  -C CUDA_ENV, --cuda_env CUDA_ENV
                        Anything special to inject into CUDA_VISIBLE_DEVICES
                        environment string
  -n NUM_TOP_PREDICTIONS, --num_top_predictions NUM_TOP_PREDICTIONS
                        Display this many predictions. (0=disable)
  -a PUSH_ADDRESS, --push_address PUSH_ADDRESS
                        server address to push the model (e.g.
                        http://localhost:8887/v2/upload)
  -A AUTH_ADDRESS, --auth_address AUTH_ADDRESS
                        server address for login and push of the model (e.g.
                        http://localhost:8887/v2/auth)
  -d DUMP_MODEL, --dump_model DUMP_MODEL
                        dump model to a directory for local running

```

# Example Usages
Please consult the [tutorials](tutorials) dirctory for usage examples.

# Release Notes
The [release notes](release-notes.md) catalog additions and modifications
over various version changes.

