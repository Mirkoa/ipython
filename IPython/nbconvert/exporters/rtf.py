"""
Exporter that will export your ipynb to RTF.
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

from IPython.utils.traitlets import Unicode

from .exporter import Exporter

#-----------------------------------------------------------------------------
# Classes
#-----------------------------------------------------------------------------

class RTFExporter(Exporter):
    """
    Exports to a RTF document (.md)
    """
    
    file_extension = Unicode(
        'rtf', config=True, 
        help="Extension of the file that should be written to disk")
