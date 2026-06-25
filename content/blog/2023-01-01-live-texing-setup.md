---
title: Resources and Remarks on Live-TeXing
date: 2023-01-01
tags:
  - LaTeX
  - Tools
  - Workflow
categories:
  - Resources
site:
  page: true
---

A collection of the tools and workflow I use to live-TeX lecture notes and convert them to PDF/HTML.

Some tools I use:

- I take notes using the [neovim editor](https://neovim.io/), manage them with the [ranger file manager](https://github.com/ranger/ranger), and convert them to PDF/HTML with [pandoc](https://pandoc.org/).
  - My [vim configuration is here](https://github.com/dzackgarza/dotfiles/blob/master/.config-sync/nvim/init.vim).
  - My informal notes are published at [notes.dzackgarza.com](https://notes.dzackgarza.com/).
  - I keep a collection of [pandoc templates and custom filters here](https://github.com/dzackgarza/dotfiles/tree/master/.pandoc).

- For diagrams:
  - [Inkscape](https://inkscape.org/) for capturing freehand stylus drawings while live-texing.
  - [q.uiver](https://q.uiver.app/) for commutative diagrams in TikzCD.
  - [https://www.mathcha.io](https://www.mathcha.io) for converting hand-drawn stylus figures to Tikz code.
  - [QTikz/KTikz](https://github.com/fhackenberger/ktikz) for plain Tikz or hand-edited TikzCD.

- For macros:
  - I have several (very unorganized) files for Latex macros:
  [a](https://github.com/dzackgarza/dotfiles/blob/master/.pandoc/custom/latexmacs.tex),
  [b](https://github.com/dzackgarza/dotfiles/blob/master/.pandoc/custom/latexmacs_categories.tex),
  [c](https://github.com/dzackgarza/dotfiles/blob/master/.pandoc/custom/latexmacs_commands.tex),
  [d](https://github.com/dzackgarza/dotfiles/blob/master/.pandoc/custom/latexmacs_spectra.tex).
  - I use a [forked version of quicktex](https://github.com/dzackgarza/quicktex) to automatically expand 2-3 letter shortcuts into full commands.
    My [library of shortcuts is here](https://github.com/dzackgarza/dotfiles/blob/master/.config-sync/nvim/after/ftplugin/pandoc/quicktex_dict.vim).
  - I use [coc.nvim](https://github.com/neoclide/coc.nvim) and [coc-snippets](https://github.com/neoclide/coc-snippets) to inline more complicated commands.
  - I use the *iabbrev* feature in neovim to [automatically correct typos](https://github.com/dzackgarza/dotfiles/blob/master/.config-sync/nvim/init.vim#L459).

Some useful resources:

- I use the [mathpix snipping tool](https://mathpix.com/) to convert clips of images to tex, and their [snip notes feature](https://snip.mathpix.com/) to convert entire PDFs or book pages.
- I keep loose research notes in [Obsidian](https://obsidian.md/).
- The [Gummi program](https://github.com/alexandervdm/gummi) has an excellent side-by-side view of tex and the PDF output which regularly updates after you've typed.
- Gilles Castel has a blog post describing [live-texing with vim](https://castel.dev/post/lecture-notes-1/), along with another post about [integrating Inkscape figures](https://castel.dev/post/lecture-notes-2/).
- Chris Schommer-Pries has written a post on [the Secret Blogging Seminar](https://sbseminar.wordpress.com/2010/02/25/chromatic-homotopy-ii-or-how-i-learned-to-stop-worrying-and-love-latexing-in-real-time/) which includes some useful tips and tricks.
