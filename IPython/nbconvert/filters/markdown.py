"""Markdown filters
This file contains a collection of utility filters for dealing with 
markdown within Jinja templates.
"""
#-----------------------------------------------------------------------------
# Copyright (c) 2013, the IPython Development Team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file COPYING.txt, distributed with this software.
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Imports
#-----------------------------------------------------------------------------
from __future__ import print_function

# Stdlib imports
import sys
import subprocess

from IPython.nbconvert.utils.pandoc import pandoc

#-----------------------------------------------------------------------------
# Functions
#-----------------------------------------------------------------------------

__all__ = [
    'markdown2html',
    'markdown2latex',
    'markdown2rst'
]

def markdown2latex(source):
    """Convert a markdown string to LaTeX via pandoc.

    This function will raise an error if pandoc is not installed.
    Any error messages generated by pandoc are printed to stderr.

    Parameters
    ----------
    source : string
      Input string, assumed to be valid markdown.

    Returns
    -------
    out : string
      Output as returned by pandoc.
    """
    return pandoc(source, 'markdown', 'latex', extra_args=['--no-wrap'])


def markdown2html(source):
    """Convert a markdown string to HTML via pandoc"""
    return pandoc(source, 'markdown', 'html', extra_args=['--mathjax --no-wrap'])

def markdown2rst(source):
    """Convert a markdown string to LaTeX via pandoc.

    This function will raise an error if pandoc is not installed.
    Any error messages generated by pandoc are printed to stderr.

    Parameters
    ----------
    source : string
      Input string, assumed to be valid markdown.

    Returns
    -------
    out : string
      Output as returned by pandoc.
    """
    return pandoc(source, 'markdown', 'rst', extra_args=['--no-wrap'])

