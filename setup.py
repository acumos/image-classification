# -*- coding: utf-8 -*-
import os
from setuptools import setup, find_packages

# extract __version__ from version file. importing will lead to install failures
setup_dir = os.path.dirname(__file__)
with open(os.path.join(setup_dir, 'image_classification', '_version.py')) as file:
    globals_dict = dict()
    exec(file.read(), globals_dict)
    __version__ = globals_dict['__version__']


setup(
    name = "image_classification",
    version = __version__,
    packages = find_packages(),
    author = "Eric Zavesky",
    author_email = "ezavesky@research.att.com",
    description = ("Image classification tool for whole-frame object and scene classification"),
    long_description = ("Image classification tool for whole-frame object and scene classification"),
    license = "Apache",
    package_data={'image_classification':['data/*']},
    scripts=['bin/run_image-classifier_reference.py'],
    entry_points="""
    [console_scripts]
    """,
    #setup_requires=['pytest-runner'],
    install_requires=['cognita_client',
                      'numpy',
                      'pillow',
                      'sklearn',
                      'keras'],
    tests_require=['pytest',
                   'pexpect'],
    include_package_data=True,
    )