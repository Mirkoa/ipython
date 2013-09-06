{% extends 'display_priority.tpl' %}

{%- block header -%}
{\rtf1\ansi{\fonttbl\f0\fswiss Arial;}\f0\pard
{%- endblock header -%}

{%- block footer -%}
}
{%- endblock footer -%}

{%- block markdowncell scoped-%}
{{ cell.source | markdown2rtf }}
{%- endblock markdowncell -%}

{%- block headingcell scoped-%}
\line\line
{{ ("#" * cell.level + cell.source) | replace('\n', ' ') | markdown2rtf | strip_files_prefix }}
{%- endblock headingcell -%}

{%- block rawcell scoped-%}
{{ cell.source }}
{%- endblock rawcell -%}

{%- block unknowncell scoped-%}
{%- endblock unknowncell -%}

{%- block in_prompt -%}
\b Input {{ cell.prompt_number }}:\b0
{%- endblock in_prompt -%}

{%- block input -%}
{\pard \brdrb \brdrs\brdrw10\brsp20 {\fs4\~}\par \pard}
{{ cell.input | highlight2rtf }}
{\pard \brdrb \brdrs\brdrw10\brsp20 {\fs4\~}\par \pard}
{%- endblock input -%}

{% block output_group scoped -%}
{
{% if cell.haspyout %}
\b Output {{ cell.prompt_number }}:\b0
{\pard \brdrb \brdrs\brdrw10\brsp20 {\fs4\~}\par \pard}
{% endif %}
{
{{ super() }}
}
{% if cell.haspyout %}
{\pard \brdrb \brdrs\brdrw10\brsp20 {\fs4\~}\par \pard}
{% endif %}
}
{%- endblock output_group %}

{%- block pyout scoped -%}
{% block data_priority scoped %}
{{ super() }}
{% endblock %}
{%- endblock pyout -%}

{%- block stream_stdout scoped -%}
{
{{- output.text | strip_ansi | escape_rtf -}}
}
{%- endblock stream_stdout -%}

{%- block stream_stderr scoped -%}
{
{{- output.text | strip_ansi | escape_rtf -}}
}
{%- endblock stream_stderr -%}

{%- block traceback_line scoped -%}
{
{{- line | strip_ansi | escape_rtf -}}
}
{%- endblock traceback_line -%}

{% block data_jpg %}
{\pict\jpegblip\bin {{ output.jpeg -}}
}
{%- endblock data_jpg %}

{%- block data_png -%}
{\pict\pngblip\bin {{ output.jpeg -}}
}
{%- endblock -%}

{%- block data_text -%}
{
{{- output.text | escape_rtf -}}
}
{%- endblock -%}

=========================================
= Not supported
=========================================

{%- block data_svg -%}
{%- endblock -%}

{%- block data_pdf -%}
{%- endblock -%}

{%- block data_html -%}
{%- endblock -%}

{%- block data_latex -%}
{%- endblock -%}
