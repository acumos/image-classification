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

# Image Classification Release Notes
## 0.5
### 0.5.1
* Update model to use single image as input type
* Update javascript demo to run with better CORS behavior (github htmlpreview)
* Additional documentation for environmental variables
* Simplify operation for active prediction to use created model (no save+load required)

### 0.5.0
* Documentation (lesson1) updated with model runner examples.  Deprecation notice
  in using explicit proto- and swagger-based serves.
* Update the structure of the protobuf input and output to use flattened (row-based)
  structure instead of columnar data for all i/o channels.  This should allow
  other inspecting applications to more easily understand and reuse implementations
  for image data.
* Update the demonstration HTML pages for similar modifications.

## 0.4
### 0.4.6
* Update image examples for open-source video.

### 0.4.5
* Documentation and package update to use install instructions instead of installing
  this package directly into a user's environment.
* License addition

### 0.4.4
* Refactor to remote the demo `bin` scripts and rewire for direct call of the
  script `classify_image.py` as the primary interaction mechanism.
* Refactor documentation into sections and tutorials.
* Create this release notes document for better version understanding.

### 0.4.3
* Minor refactor to avoid possibly reserved syntax name

### 0.4.2
* Refactor for compliant dataframe usage following primary client library
  examples for repeated columns (e.g. dataframes) instead of custom types
  that parsed rows individually.
* Refactor web, api, main model wrapper code for corresponding changes.

### 0.4.0
* Migration from previous library structure to new acumos client library
* Refactor to not need **this** library as a runtime/installed dependency

## 0.3
* Added example for evaluation of a multiple image with all results, saving predictions.
