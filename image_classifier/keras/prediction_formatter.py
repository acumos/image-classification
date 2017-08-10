#! python
# -*- coding: utf-8 -*-

import pandas as pd


def prediction_transform(preds, class_list=None, path_class=None):
    """
    Transform predictions by pairing with class labels
    :param preds: the numpy result after prediction
    :param class_list: class list for pairing
    :param path_class: path for class listing file
    :return: dataframe sorted by descending probability
    """
    df = pd.DataFrame(preds.transpose(), columns=['probability'])
    if class_list is None:  # must simulate or load the class list
        if not path_class:
            class_list = ['class_{:}'.format(idx) for idx in range(len(preds))]
        else:
            dictClasses = eval(open(path_class, 'r').read())
            class_list = [dictClasses[ix-1] for ix in list(df.index)]  # NOTE: special -1 offset
    df.insert(0, 'class', class_list)

    #print("Class is: " + classes[np.argmax(preds) - 1])
    df.sort_values(['probability'], ascending=False, inplace=True)
    return df
