# image-classification
A model example for image classification within Acumos.

## Image Classification Keras Use-case (Acumos)
This source code creates and pushes a model into Acumos that processes
incoming images and outputs a number of classification probability values.
This model utilizes the pretrained network from [keras inception v4](https://github.com/kentsommer/keras-inceptionV4)
and utilizes the [pretrained keras model](https://github.com/kentsommer/keras-inceptionV4/releases).
It closely follows the [image classification example](https://tensorflow.org/tutorials/image_recognition/)
provided as part of the tensorflow documentation.
At time of writing, this sample does not support retraining.


### Package dependencies
Package dependencies for the core code and testing have been flattened into a
single file for convenience. Instead of installing this package into your
your local environment, execute the command below.

```
pip install -r requirments.txt
```

**Note:** If you are using an [anaconda-based environment](https://anaconda.org),
you may want to try
installing these packages [directly](https://docs.anaconda.com/anaconda-repository/user-guide/tasks/pkgs/download-install-pkg).
to avoid mixing of `pip` and `conda` package stores.


### Usage
This package contains runable scripts for command-line evaluation,
packaging of a model (both dump and posting), and simple web-test
uses.   All functionality is encapsulsted in the `classify_image.py`
script and has the following arguments.

```
usage: classify_image.py [-h] [-m MODEL_PATH] [-l LABEL_PATH]
                         [-p PREDICT_PATH] [-i IMAGE] [-I IMAGE_LIST]
                         [-f {keras,tensorflow}] [-C CUDA_ENV]
                         [-n NUM_TOP_PREDICTIONS] [-a PUSH_ADDRESS]
                         [-A AUTH_ADDRESS] [-d DUMP_MODEL]

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
                        Absolute path to image file. (for now must be a jpeg)
  -I IMAGE_LIST, --image_list IMAGE_LIST
                        To batch process multiple images in one load
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
                        dump model to a pickle directory for local running
```

# Example Usages
Please consult the [tutorials](tutorials) dirctory for usage examples.

# Release Notes
The [release notes](release-notes.md) catalog additions and modifications
over various version changes.

