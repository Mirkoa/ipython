# coding: utf-8
"""String filters.

Contains a collection of useful string manipulation filters for use in Jinja
templates.
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

import os
import re
import textwrap
from xml.etree import ElementTree

from IPython.core.interactiveshell import InteractiveShell
from IPython.utils import py3compat

#-----------------------------------------------------------------------------
# Functions
#-----------------------------------------------------------------------------

__all__ = [
    'wrap_text',
    'html2text',
    'add_anchor',
    'strip_dollars',
    'strip_files_prefix',
    'comment_lines',
    'get_lines',
    'ipython2python',
    'posix_path',
    'escape_rtf'
]


def wrap_text(text, width=100):
    """ 
    Intelligently wrap text.
    Wrap text without breaking words if possible.
    
    Parameters
    ----------
    text : str
        Text to wrap.
    width : int, optional
        Number of characters to wrap to, default 100.
    """

    split_text = text.split('\n')
    wrp = map(lambda x:textwrap.wrap(x,width), split_text)
    wrpd = map('\n'.join, wrp)
    return '\n'.join(wrpd)


def html2text(element):
    """extract inner text from html
    
    Analog of jQuery's $(element).text()
    """
    if isinstance(element, py3compat.string_types):
        element = ElementTree.fromstring(element)
    
    text = element.text or ""
    for child in element:
        text += html2text(child)
    text += (element.tail or "")
    return text


def add_anchor(html):
    """Add an anchor-link to an html header tag
    
    For use in heading cells
    """
    h = ElementTree.fromstring(py3compat.cast_bytes_py2(html, encoding='utf-8'))
    link = html2text(h).replace(' ', '-')
    h.set('id', link)
    a = ElementTree.Element("a", {"class" : "anchor-link", "href" : "#" + link})
    a.text = u'¶'
    h.append(a)

    # Known issue of Python3.x, ElementTree.tostring() returns a byte string
    # instead of a text string.  See issue http://bugs.python.org/issue10942
    # Workaround is to make sure the bytes are casted to a string.
    return py3compat.decode(ElementTree.tostring(h), 'utf-8')


def strip_dollars(text):
    """
    Remove all dollar symbols from text
    
    Parameters
    ----------
    text : str
        Text to remove dollars from
    """

    return text.strip('$')


files_url_pattern = re.compile(r'(src|href)\=([\'"]?)files/')

def strip_files_prefix(text):
    """
    Fix all fake URLs that start with `files/`,
    stripping out the `files/` prefix.
    
    Parameters
    ----------
    text : str
        Text in which to replace 'src="files/real...' with 'src="real...'
    """
    return files_url_pattern.sub(r"\1=\2", text)


def comment_lines(text, prefix='# '):
    """
    Build a Python comment line from input text.
    
    Parameters
    ----------
    text : str
        Text to comment out.
    prefix : str
        Character to append to the start of each line.
    """
    
    #Replace line breaks with line breaks and comment symbols.
    #Also add a comment symbol at the beginning to comment out
    #the first line.
    return prefix + ('\n'+prefix).join(text.split('\n')) 


def get_lines(text, start=None,end=None):
    """
    Split the input text into separate lines and then return the 
    lines that the caller is interested in.
    
    Parameters
    ----------
    text : str
        Text to parse lines from.
    start : int, optional
        First line to grab from.
    end : int, optional
        Last line to grab from.
    """
    
    # Split the input into lines.
    lines = text.split("\n")
    
    # Return the right lines.
    return "\n".join(lines[start:end]) #re-join


def ipython2python(code):
    """Transform IPython syntax to pure Python syntax

    Parameters
    ----------

    code : str
        IPython code, to be transformed to pure Python
    """
    shell = InteractiveShell.instance()
    return shell.input_transformer_manager.transform_cell(code)


def posix_path(path):
    """Turn a path into posix-style path/to/etc
    
    Mainly for use in latex on Windows,
    where native Windows paths are not allowed.
    """
    if os.path.sep != '/':
        return path.replace(os.path.sep, '/')
    return path


def escape_rtf(text):
    """Escape RTF characters in a string of text
    """
    return text.replace('\\', '\\\\').replace('{', '\\{').replace('}', '\\}')
