---
title: LaTeX Handwriting Practice Worksheets
date: 2020-08-03
tags:
  - Latex
  - Tablets
  - Handwriting
  - Mathematics
categories:
  - Advice and Resources
site:
  page: true
---

Having never quite been able to write $\zeta$ or $\xi$ correctly, I cobbled together some code to generate worksheets to help practice my handwriting.
Since a few people have expressed interest in them, I thought I'd share the documents and code here!

The idea is fairly simple: you toss in a bunch of symbols you want to practice writing, and it generates a grade-school-style worksheet with the symbols sketched out in dotted lines:

![image-20200803211425525](/assets/images/image-20200803211425525.png)

You can then either print this out and write over the symbols with any real-life writing implement, or just import them into your favorite PDF annotation software and practice using a stylus.

If you just want to take a direct look, [here is a sample PDF](/assets/pdfs/handwriting.pdf) and [here is raw tex code](/assets/pdfs/handwriting.tex).

The code is fairly simple:

```latex

\documentclass{article}
\usepackage{graphicx}
\usepackage{dashrule}
\usepackage{pgf, pgffor}
\usepackage{amsfonts}

\newsavebox\myboxX
\newsavebox\myboxx
\newdimen\heightX
\newdimen\heightx

\newcommand{\setline}[2]{%
    \savebox\myboxX{\scalebox{#1}{X}}%
    \savebox\myboxx{\scalebox{#1}{x}}%
    \heightX=\ht\myboxX
    \heightx=\ht\myboxx
    \noindent\ooalign{\rule[\heightX]{\textwidth}{.1pt}\cr
    \noindent\hdashrule[\heightx]{\textwidth}{.1pt}{1mm}\cr
    \noindent\rule{\textwidth}{.1pt}\cr
    \noindent\scalebox{#1}{\pdfliteral{q 1 Tr [.1 .2]0 d .1 w}#2\pdfliteral{Q}}}%
}

\begin{document}

\foreach \n in {
  \zeta, \eta,
  \kappa, \nu, \xi, \rho, \sigma,
  \tau, \phi, \varphi, \chi, \psi, \omega,
  \mathfrak{g}, \mathfrak{h}, \mathfrak{n},
  \mathfrak{b}, \mathfrak{z}, \mathfrak{s},
  \mathfrak{l}, \mathfrak{p},
  \Phi
}{
\foreach \j in {1, 2, ..., 10}{
  \setline{5}{$\n\n\n\n\n\n\n\n\n\n$}\vspace{0.25cm}\\
}
}

\end{document}

```

You can swap out anything appearing in the `foreach` section for whatever symbols you’d like to practice. So far, it has seemed to work with just about everything I’ve thrown at it, so give it a try!

If you have any ideas for improvements or generate cool worksheets, let me know and I’d be more than happy to link and share them here!

> Note that there is a slight caveat: each symbol is printed with a wide interior region, which can make tracing with fine-tipped pens difficult.
> I don't currently know a way around this.

