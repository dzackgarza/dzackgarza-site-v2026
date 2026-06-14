---
title: Writing
site:
  page: true
  schema: page.v1
  route: /writing/
---

# Notes

::: {.notice--info}
Although it is unlikely to be very useful to anyone at this stage, you can find my [informal/in-progress notes wiki here](http://notes.dzackgarza.com/).
You can also find my even *less* organized math journal [here](https://notes.dzackgarza.com/Notes/Quick_Notes.html).
:::

::: {.component type="collection" items="notes"}
:::

## Talks / Seminars / Mini Courses

- IAS/PCMI Graduate Summer School: Motivic Homotopy

  - Combined Notes

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/6_Combined/Combined_Talks.pdf),
    [<i class="fab fa-html5"></i> HTML](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/6_Combined/Combined_Talks.html)

  - Danny Krashen, "Field arithmetic and the complexity of algebraic objects"

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/1_Krashen/Krashen_Talks.pdf),
    [<i class="fab fa-html5"></i> HTML](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/1_Krashen/Krashen_Talks.html)

  - Philippe Gille, "G-torsors over affine curves"

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/2_Gille/Gille_Talks.pdf),
    [<i class="fab fa-html5"></i> HTML](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/2_Gille/Gille_Talks.html)

  - Frédéric Déglise, "Motivic categories"

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/3_Deglise/Deglise_Talks.pdf),
    [<i class="fab fa-html5"></i> HTML](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/3_Deglise/Deglise_Talks.html)

  - Kirsten Wickelgren, "An introduction to $\AA^1$ homotopy theory using enumerative examples"

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/4_Wickelgren/Wickelgren_Talks.pdf),
    [<i class="fab fa-html5"></i> HTML](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/4_Wickelgren/Wickelgren_Talks.html)

  - Matthew Morrow, "Aspects of motivic cohomology"

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/5_Morrow/Morrow_Talks.pdf),
    [<i class="fab fa-html5"></i> HTML](https://dzackgarza.com/rawnotes/Class_Notes/2021/Summer/PCMI/5_Morrow/Morrow_Talks.html)

- Reading Seminar: Salamon-McDuff, "J-Holomorphic Curves and Symplectic Topology"
  - Gromov-Witten invariants and regularity theorems:

    [Typeset Notes <i class="fas fa-file-pdf"></i>](https://dzackgarza.com/assets/pdfs/expository/GW_Notes_June_26.pdf),
    [Slides and Handwritten Notes <i class="fas fa-file-pdf"></i>](https://dzackgarza.com/assets/pdfs/expository/GW_Talk_June_26.pdf)

- VRG notes on tilings and translation surfaces:

  [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/assets/notes/Tilings.pdf),
  [<i class="fab fa-html5"></i> HTML](https://dzackgarza.com/assets/notes/Tilings.pdf)

- Arizona Winter School, 2019

  - Kirsten Wickelgren: A1 Enumerative Geometry

    [<i class="fas fa-file-pdf"></i> PDF (Old version)](/assets/pdfs/AWS2019_Wickelgren.pdf)

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Obsidian/Archive/AWS2019/Typeset/Wickelgren/AWS2019_Wickelgren.pdf)

  - Matthew Morrow: Topological Hochschild Homology in Arithmetic Geometry

    [<i class="fas fa-file-pdf"></i> PDF](https://dzackgarza.com/rawnotes/Obsidian/Archive/AWS2019/Typeset/Morrow/ASS2019_Morrow.pdf)

- UCSD Algebraic Geometry Conference, 2019

  [<i class="fas fa-file-pdf"></i> Talk Notes (PDF)](https://dzackgarza.com/_pages/UCSD-Algebraic-Geometry-Conference-2019.html)

----------

# Links to Notes by Others

::: {.component type="link-group" items="notes_by_others"}
:::

# Resources / Remarks on Live-Texing

Some tools I use:

- I take notes using the [neovim editor](https://neovim.io/), manage them with the [ranger file manager](https://github.com/ranger/ranger), and convert them to PDF/HTML with [pandoc](https://pandoc.org/).
  - My [vim configuration is here](https://github.com/dzackgarza/dotfiles/blob/master/.config-sync/nvim/init.vim).
  - My [entire notes respository is stored here](https://github.com/dzackgarza/Notes).
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
  - I use [coc.nvim](https://github.com/neoclide/coc.nvim) and [coc-snippets](https://github.com/neoclide/coc-snippets) to inline more complicated commands
  - I use the *iabbrev* feature in neovim to [automatically correct typos](https://github.com/dzackgarza/dotfiles/blob/master/.config-sync/nvim/init.vim#L459).

Some useful resources:

- I use the [mathpix snipping tool](https://mathpix.com/) to convert clips of images to tex, and their [snip notes feature](https://snip.mathpix.com/) to convert entire PDFs or book pages.
- I keep loose research notes in [Obsidian](https://obsidian.md/).
- The [Gummi program](https://github.com/alexandervdm/gummi) has an excellent side-by-side view of tex and the PDF output which regularly updates after you've typed.

- Gilles Castel has a blog post describing [live-texing with vim](https://castel.dev/post/lecture-notes-1/), along with another post about [integrating Inkscape figures](https://castel.dev/post/lecture-notes-2/)

- Chris Schommer-Pries has written a post on [the Secret Blogging Seminar](https://sbseminar.wordpress.com/2010/02/25/chromatic-homotopy-ii-or-how-i-learned-to-stop-worrying-and-love-latexing-in-real-time/) which includes some useful tips and tricks.
