local note_count = 0

local function strip_single_paragraph(html)
  local inner = html:match("^%s*<p>(.*)</p>%s*$")
  return inner or html
end

function Note(note)
  note_count = note_count + 1
  local id = "sn-" .. note_count
  local html = strip_single_paragraph(pandoc.write(pandoc.Pandoc(note.content), "html5"))

  return pandoc.RawInline(
    "html",
    '<label for="' .. id .. '" class="margin-toggle sidenote-number"></label>'
      .. '<input type="checkbox" id="' .. id .. '" class="margin-toggle"/>'
      .. '<span class="sidenote">' .. html .. '</span>'
  )
end
