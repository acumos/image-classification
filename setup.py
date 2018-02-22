# ===============LICENSE_START=======================================================
# Acumos Apache-2.0
# ===================================================================================
# Copyright (C) 2017-2018 AT&T Intellectual Property & Tech Mahindra. All rights reserved.
# ===================================================================================
# This Acumos software file is distributed by AT&T and Tech Mahindra
# under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# This file is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ===============LICENSE_END=========================================================
# -*- coding: utf-8 -*-
import os
from setuptools import setup   # , find_packages
from setuptools.command.install import install

# warning (if run in verbose mode) about installing this object
class new_install(install):
    def run(self):
        with open(os.path.join(setup_dir,"INSTALL.txt")) as f:
            print(f.read())
        install.run(self)


# extract __version__ from version file. importing will lead to install failures
setup_dir = os.path.dirname(__file__)
with open(os.path.join(setup_dir, 'image_classifier', '_version.py')) as file:
    globals_dict = dict()
    exec(file.read(), globals_dict)
    __version__ = globals_dict['__version__']


# read requirements list from supplementary file in this repo
requirement_list = [ line for line in open(os.path.join(setup_dir,'requirements.txt')) if line and line[0] != '#' ]


setup(
    name='image_classifier',
    version=__version__,
    packages=[],
    author="Eric Zavesky",
    author_email="ezavesky@research.att.com",
    description=("Image classification tool for whole-frame object and scene classification"),
    long_description=("Image classification tool for whole-frame object and scene classification"),
    license="Apache",
    # package_data={globals_dict['MODEL_NAME']: ['data/*']},
    # setup_requires=['pytest-runner'],
    entry_points="""
    [console_scripts]
    """,
    # setup_requires=['pytest-runner'],
    install_requires=requirement_list,
    tests_require=[],
    cmdclass={'install': new_install},
    include_package_data=True,
)
