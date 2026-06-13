---
title: Setting Up A Haskell Dev Environment
date: 2015-05-30
tags:
  - Haskell
  - Programming
  - Linux
categories:
  - Tutorials
site:
  page: true
---

Since the second week of this year's GSOC is drawing to a close, I figured I'd
take a minute to write a bit about my experience diving into Haskell
development.

As someone relatively new to the Haskell world, I've had quite a bit to
learn - fortunately, there's pleny of documentation out there, and the IRC
community is incredibly helpful as well (particularly #haskell, #hackage,
and #haskell-beginners on Freenode).

However, the packaging and build tools themselves are in constant development,
and working with cabal can be a bit tricky at first. In particular, there's a
lot of noise in forums and wikis concerning the best way to source your
haskell packages - at this point, there are at several separate, viable
ways to manage them:

* Use the Haskell packages provided by your distro's package manager,

* Install cabal from your distro's package manager, use it to bootstrap
cabal-install, then pull and build packages from hackage using
`cabal install <package_name>`.

* Clone repos from git or darcs directly, and create binaries using
`cabal install` in the project's root directory (preferably using sandboxes), or

* Use one another tool to help streamline the process, such as the
Nix package manager or Halcyon.


Personally, I've run into issues with some of these methods. I work across
three different operating systems (Debian, Arch, and Windows), and coordinating
equivalent packages can be tedious at best.
Bootstrapping cabal-install can very quickly lead to the infamous "cabal hell",
in which it becomes difficult to keep track of exactly which packages are
sourced as dependencies when you build something new. Cloning repos manually
works fairly well, but in this case it's difficult to install system-wide tools
that rely on GHC such as HLint, ghc-mod, hdevtools, or really any other package
that's compiled against the GHC API.

For these reasons, I decided to combine approaches 3 and 4 to set up a
reliable and easily reproducible dev environment -- I rely on the package
manager to provide an up-to-date version of GHC for building packages from
source, and have a global config using halcyon that I can switch into with a
few commands for doing dev work.

There are some pretty nice benefits to doing things this way - for example, I
use the haskell-based xmonad for my window manager. With this setup, I can
compile my configuration against the newest version of GHC, and not have to
worry about one of its dependencies clobbering another project's dependencies
or having to roll back my global version of GHC to install older packages.

Overall, it's proved so far to be a great way to keep dependencies cleanly
separated, while still allowing multiple versions of ghc and cabal to be
installed alongside each other. Setting things up is pretty straightforward, so
here's a quick rundown of what you can do to quickly get a dev environment
rolling.

# Install Halycon

In my case, it was easiest to start with a clean OS installation. Assuming
you're using a \*nix variant, the steps should be roughly similar.

Start by installing halcyon -- in my case, I did so as root to simplify things.
You can find a tutorial over at <https://halcyon.sh/tutorial/>, but the key bit
is to run:

```bash
eval "$( curl -sL https://github.com/mietek/halcyon/raw/master/setup.sh )"
```

and check that `which ghc` and `which cabal` both return paths in the /app/
directory.


From this point on, any user with access to the /app/ directory can call
`eval "$( /app/halcyon/halcyon paths` )"` to jump into this environment - this
command takes care of putting the correct versions of ghc and cabal at the
front of your path, regardless of which versions you may have otherwise
installed elsewhere.

You can then use `halcyon install` in place of `cabal install`
to ensure that your packages are built against the particular versions of ghc
and cabal you just installed.

# Grab Some Dev Tools

In particular, if you're doing development with these versions, you'll want to
build any tools that require executables using halcyon -- here are a few
examples to get you started:

### **ghc-mod** (<https://hackage.haskell.org/package/ghc-mod>)
Provides vim/emacs integration for type checking, linting, and showing compiler
errors. Pairs really well with **ghcmod-vim**
(<https://github.com/eagletmt/ghcmod-vim>) and **syntastic**
(<https://github.com/scrooloose/syntastic>) for vim users.

### **hasktags** (<https://hackage.haskell.org/package/hasktags>)
A ctags alternative for Haskell projects. Use this to generate a .tags file for
your project, and you can easily jump to function/type definitions using
Ctrl-].

### **codex** (<https://hackage.haskell.org/package/codex>)
Uses hasktags to build your entire tags database with a single command
- `codex update`. What's more, it also includes the tags of all of your
project's dependencies --  so if, for example, you run `cabal install`
inside of a sandbox, you can easily jump into the source code of
other libraries and see function definitions, types, etc.

### **hscope** (<https://hackage.haskell.org/package/hscope>)
A cscope alternative for Haskell, which is kind of a reverse-direction ctags.
After generating a database, you can press Ctrl-\ on a function definition to
instantly find all of the places in your project that call that function.
Paired with hasktags, jumping through a new codebase is a breeze.

### **hlint** (<https://hackage.haskell.org/package/hlint>)
Quickly parses a file and provides suggestions for style improvement. Can also
be called using **syntastic** in vim (using :SyntasticCheck hlint).

### **hoogle** (<https://hackage.haskell.org/package/hoogle>)
A Haskell-specific search engine, lets you quickly look up function type
signatures and definitions. Also has a neat feature that lets you search for
functions by type signature -- for example, searching for
`(a->b)->[a]->[b]` brings up the map function and a few examples of how to use
it. Super handy!

If you install any or all of these using `halcyon install`, their binaries will
be placed in /app/bin/, and will be on your path any time you're using
halcyon's environment.

# Get Text Editor Integration

After trying several IDEs and plugins, I found that using vim with a few choice
plugins netted me all of the features I really needed, and required the least
troubleshooting.

## The Necessities

If you're just looking to get started as soon as possible, look no further
than...
### **haskell-vim-now** (<https://github.com/begriffs/haskell-vim-now>)
It has an automated setup, and provides a ton of great Haskell-specific tools
right out of the box. (See the readme for the default key bindings.)

However, if you're like me and already have a ridiculously long vimrc built up,
take a look following repos for some useful plugins:

### **syntastic** (<https://github.com/scrooloose/syntastic>)
Easily the plugin I use the most, and derive the most value from. If you have
the ghc-mod binary on your path (which would be the case if you ran the eval
command from earlier), then you can easily check your current file. With a few
mappings like

```vim
map <silent> <leader>hc :SyntasticCheck<CR>
map <silent> <leader>hl :SyntasticCheck hlint<CR>
```

, you can quickly get line markers and status messages for any errors. This
also works within projects quite well, and will only recompile files that
have changed since the last build (note: this can still be a bit slow for large
projects).


### **ghcmod-vim** (<https://github.com/eagletmt/ghcmod-vim>)
Can also perform type checking and linting, but one of its most useful features
is the ability to display the type of an expression under the cursor by calling
`:GhcModType`, or to pull up info about its definition with `:GhcModInfo`.

### **haskellmode-vim** (<https://github.com/lukerandall/haskellmode-vim>)
Mainly fixes up some extra syntax highlighting and indentation. Also offers a
few neat features like looking up the word under the cursor on hoogle, and
automatically adding qualified imports.

### **vim-haskellConcealPlus**
(<https://github.com/enomsg/vim-haskellConcealPlus>)
This one's purely aesthetic, and a great way to test exactly how well your
terminal emulator support UTF-8! Uses vim conceals to show some Haskell
operators and keywords as symbols (that is, it displays them as special symbols
unless they are on your current line). This is particularly useful when you're
browing large swaths of code, and want to make things a bit more readable.
Note: this does need a small hack not to be a complete eyesore. By default, vim
adds a background highlight to every concealed character. You can clear this by
throwing

```vim
au FileType haskell autocmd VimEnter * hi clear Conceal
```

into your vimrc.


## General Vim Goodness

Here are some other useful plugins (not Haskell-specific) for jumping around large projects include:

* **CtrlP** (<https://github.com/kien/ctrlp.vim>)
Open files with a fuzzy-finder.

* **Ag** (<https://github.com/ervandew/ag>)
Fast replacement for vimgrep, quickly find specific words from files in your
current working tree.

* **Supertab** (<https://github.com/ervandew/supertab>)
Provides tab-completion - suggestion list can be populated from local buffer or
other plugins like neco-ghc.

* **Fugitive** (<https://github.com/tpope/vim-fugitive>)
Provides most common git commands within vim.


# Workflow
Finally, the good part! Everything's easy from here on out. With everything
installed, you can create a user and chown the /app/ directory. Then, you can
go about your day-to-day business with your package manager's version of ghc
and cabal (just remember to run `cabal sandbox init` before building/installing
to keep things as clean as possible).

Then, whenever you're working on a dev project, just call the eval statement
mentioned up in the halcyon section, and all of the binaries you installed with
halcyon will be on your path, all linked properly, and you'll be using the same
versions of ghc and cabal each and every time.

Generally, before I start working on a project, I run a function that looks
something like this:

```bash
git clone http://url/to/your/project ~/project_directory
cd ~/project_directory
eval "$( /app/halcyon/halcyon paths )"
cabal sandbox init
cabal install
cabal build
```


And there you have it! Hopefully this serves as a bit of help to anyone else
getting started with Haskell. Please feel free to leave any questions or
comments below!

