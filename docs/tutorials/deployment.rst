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

.. _deployment_image-classification:


==============================================================
Deployment: Wrapping and Executing Image Classification Models
==============================================================

To utilize this classifier model, it wraps and deploys a version of the
underlying keras (or tensorflow) model.  Continue to the :ref:`demonstration-image_classification`
to see how to utilize these models in a demo scenario.

Model Deployment
================
Following similar use pattens described by the main client library, there are
two primary modes to export and deploy the generated classifier: by dumping
it to disk or by pushing it to an onboarding server.  Please consult the
:ref:`image-classification_usage` for more specific arguments
but the examples below demonstrate basic capabilities.

* `elephant.jpg <https://www.pexels.com/photo/animal-big-ear-elephant-133393/>`_
* `panda.jpg <https://www.pexels.com/photo/red-panda-eating-green-leaf-on-tree-branch-during-daytime-146033/>`_


Example for training a model that will return the top 100 classifier scores.

.. code:: bash

    python image_classifier/classify_image.py -m model.h5 -f keras -l data/keras_class_names.txt -n 100 -d model -i data/elephant.jpg

Example for training a model, dumping it to disk, and pushing that model that returns all scores. **(recommended)**

.. code:: bash

    export ACUMOS_USERNAME="user"; \
    export ACUMOS_PASSWORD="password";
    or
    export ACUMOS_TOKEN="a_very_long_token";

    export ACUMOS_PUSH="https://acumos-challenge.org/onboarding-app/v2/models"; \
    export ACUMOS_AUTH="https://acumos-challenge.org/onboarding-app/v2/auth"; \
    python image_classifier/classify_image.py -n 0 -d model

In-place Evaluation
-------------------
In-place evaluation will not utilize a serialized version of the model and will
instead wrap it in memory and use it in-place.  This mode is handy for quick
evaluation of images or image sets for use in other classifiers.

* `model-t.jpg <https://www.pexels.com/photo/aged-antique-automobile-automotive-208582/>`_

Example for dumping model for use in cascade scenario (all classes return probability). *recommended*

.. code:: bash

    python image_classifier/classify_image.py -n 0 -d model

Example for evaluation of a test image with top 5 results.

.. code:: bash

    python image_classifier/classify_image.py -m model.h5 -i data/model-t.jpg -f keras -l data/keras_class_names.txt -n 5

Example for evaluation of a multiple image with all results, saving predictions. __(Added v0.3)__

.. code:: bash

    python image_classifier/classify_image.py -m model.h5 -I data/image_list.txt -f keras -p data/features.csv -l data/keras_class_names.txt -n 0


Model Runner: Using the Client Library
======================================

Getting even closer to what it looks like in a deployed model, you can also use
the model runner code to run classification locally. *(added v0.5.0)*


1. First, decide the ports to run your classification and other models. In the example
below, classiciation runs on port ``8886``.


2. Second, dump and launch the classification model. If you modify the ports to
run the models, please change them accordingly.  This command example assumes
that you have cloned the client library in a relative path of ``../acumos-python-client``.
The first line removes any prior model directory, the second dumps the detect
model to disk, and the third runs the model.


.. code:: bash

    rm -rf model; \
        python image_classifier/classify_image.py -m model.h5 -f keras -l data/keras_class_names.txt -n 0 -d model -i data/elephant.jpg; \
        python ../acumos-python-client/testing/wrap/runner.py --port 8886 --modeldir model/image_classifier --no_downstream

