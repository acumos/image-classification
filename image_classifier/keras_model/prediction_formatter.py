#! python
# -*- coding: utf-8 -*-
"""
Simple scikit-based transformer for transforming numpy predictions into a dataframe with classes
"""

from __future__ import print_function

import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin


class Formatter(BaseEstimator, ClassifierMixin):
    """Format predictions by binding to class names"""
    COL_NAME_IDX = "image"
    COL_NAME_CLASS = "tag"
    COL_NAME_PREDICTION = "score"

    def __init__(self, class_map=None, top_n=30):
        """
        Initialize the formatter with a class map
        :param top_n: limit of top scoring hits to return; 0=all
        :param class_map: map of {index:string , ...}
        """
        self.top_n = top_n
        self.class_map = class_map
        self.class_list = None

    def get_params(self, deep=False):
        return {'class_map': self.class_map,
                'top_n': self.top_n}

    @staticmethod
    def generate_output_dataframe(tag_idx=0, tag_class="", tag_score=0.0):
        return pd.DataFrame([[tag_idx, tag_class, tag_score]],
                            columns=[Formatter.COL_NAME_IDX, Formatter.COL_NAME_CLASS, Formatter.COL_NAME_PREDICTION])

    @staticmethod
    def generate_output_types():
        return [int, str, float]

    @property
    def output_types_(self):
        _types = self.classes_
        return [{Formatter.COL_NAME_IDX: _types[0]}, {Formatter.COL_NAME_CLASS: _types[1]}, {Formatter.COL_NAME_PREDICTION: _types[2]}]

    @property
    def n_outputs_(self):
        return 3

    @property
    def classes_(self):
        return Formatter.generate_output_types()

    def fit(self, x, y=None):
        return self

    def predict(self, X, y=None):
        if type(X) == pd.DataFrame:
            X = X.as_matrix()

        df_predict_set = None
        for image_idx in range(len(X)):
            np_predict = X[image_idx, :]
            if self.class_list is None:  # may need to init from map one time
                num_class = np_predict.shape[1]
                self.class_list = Formatter.prediction_list_gen(self.class_map, range(num_class))

            df_predict = Formatter.prediction_transform(np_predict, self.class_list)
            df_predict.insert(0, Formatter.COL_NAME_IDX, image_idx)
            if self.top_n != 0:  # need to prune results (already sorted, so just clip)
                df_predict = df_predict[:self.top_n]

            if df_predict_set is None:
                df_predict_set = df_predict
            else:
                df_predict_set = df_predict_set.append(df_predict, ignore_index=True)
        return df_predict_set.reset_index(drop=True)

    def score(self, X, y=None):
        return 0

    @staticmethod
    def prediction_list_gen(dict_classes, list_idx):
        if dict_classes is None:
            return ['{:}_{:}'.format(Formatter.COL_NAME_CLASS, ix) for ix in list_idx]
        return [dict_classes[ix - 1] for ix in list_idx]  # NOTE: special -1 offset

    @staticmethod
    def prediction_transform(preds, class_list=None, path_class=None):
        """
        Transform predictions by pairing with class labels
        :param preds: the numpy result after prediction
        :param class_list: class list for pairing
        :param path_class: path for class listing file
        :return: dataframe sorted by descending probability
        """
        df = pd.DataFrame(preds.transpose(), columns=[Formatter.COL_NAME_PREDICTION])
        if class_list is None:  # must simulate or load the class list
            dict_classes = None
            if path_class is None or not path_class:
                dict_classes = eval(open(path_class, 'r').read())
            class_list = Formatter.prediction_list_gen(dict_classes, list(df.index))
        df.insert(0, Formatter.COL_NAME_CLASS, class_list)

        # print("Class is: " + classes[np.argmax(preds) - 1])
        df.sort_values([Formatter.COL_NAME_PREDICTION], ascending=False, inplace=True)
        return df
