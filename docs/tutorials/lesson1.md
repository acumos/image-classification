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

# Wrapping Models for Deployment
To utilize this classifier model, it wraps and deploys a version of the
underlying keras (or tensorflow) model.  Continue to the [next tutorial](lesson2.md)
to see how to utilize these models with a simple demo API server.

## Model Deployment
Following similar use pattens described by the main client library, there are
two primary modes to export and deploy the generated classifier: by dumping
it to disk or by pushing it to an onboarding server.  Please consult the
[reference manual](../image-classification.md#usage) for more specific arguments
but the examples below demonstrate basic capabilities.

Example for training a model that will return the top 100 classifier scores.
```
python image_classifier/classify_image.py -m model.h5 -f keras -l data/keras_class_names.txt -n 100 -d model -i data/elephant.jpg
```

Example for training a model and pushing that model that returns all scores.
```
python image_classifier/classify_image.py -m model.h5 -f keras -l data/keras_class_names.txt -n 0 -i data/elephant.jpg -a "http://localhost:8887/v2/upload" -A "http://localhost:8887/v2/auth"
```

## In-place Evaluation
In-place evaluation will not utilize a serialized version of the model and will
instead wrap it in memory and use it in-place.  This mode is handy for quick
evaluation of images or image sets for use in other classifiers.

Example for evaluation of a test image with top 5 results.
```
python image_classifier/classify_image.py -m model.h5 -i data/model-t.jpg -f keras -l data/keras_class_names.txt -n 5
```

Example for evaluation of a multiple image with all results, saving predictions. __(Added v0.3)__
```
python image_classifier/classify_image.py -m model.h5 -I data/image_list.txt -f keras -p data/features.csv -l data/keras_class_names.txt -n 0
```
