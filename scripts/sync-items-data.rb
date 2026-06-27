#!/usr/bin/env ruby
# Sync content/_data/items.yaml and per-file parts under content/_data/items.

require "yaml"
require "pathname"

DATA_DIR = Pathname.new("content/_data")
ITEMS_PATH = DATA_DIR / "items.yaml"
PARTS_DIR = DATA_DIR / "items"
TOP_LEVEL_KEY = /\A([A-Za-z0-9_]+):(?:\s+#.*)?\s*\z/

def panic(msg)
  warn "sync-items-data: #{msg}"
  exit 1
end

def load_yaml(path)
  data = YAML.load_file(path)
  panic("#{path} did not contain YAML data") if data.nil?
  data
end

def extract_sections(path)
  sections = []
  current_key = nil
  current_lines = []

  path.read.each_line do |line|
    if (match = line.match(TOP_LEVEL_KEY))
      sections << [current_key, current_lines.join] if current_key
      current_key = match[1]
      current_lines = [line]
      next
    end

    current_lines << line if current_key
  end

  sections << [current_key, current_lines.join] if current_key
  sections
end

def top_level_keys_from_items
  data = load_yaml(ITEMS_PATH)
  return [] unless data.is_a?(Hash)

  data.keys.map(&:to_s)
rescue Psych::SyntaxError
  []
end

def part_paths
  Dir[PARTS_DIR.join("*.yaml")].each_with_object({}) do |path, memo|
    memo[File.basename(path, ".yaml")] = Pathname.new(path)
  end
end

def section_from_part(path)
  normalized = path.read.sub(/\A---\s*\n/, "")
  normalized.sub!(/\A[ \t]*\n/, "")
  normalized.rstrip + "\n"
end

def merge_parts_mapping(paths)
  merged = {}
  paths.each do |key, path|
    file_data = load_yaml(path)
    unless file_data.is_a?(Hash)
      panic("#{path} must contain a YAML mapping")
    end
    if file_data.length != 1
      panic("#{path} must contain exactly one top-level key")
    end

    key_on_disk, value = file_data.first
    if merged.key?(key_on_disk)
      panic("duplicate top-level key #{key_on_disk.inspect} found in #{path}")
    end
    merged[key_on_disk] = value
  end
  merged
end

def split_items
  sections = extract_sections(ITEMS_PATH)
  if sections.empty?
    panic("expected #{ITEMS_PATH} to contain top-level sections")
  end

  PARTS_DIR.mkpath
  sections.each do |key, section|
    target = PARTS_DIR / "#{key}.yaml"
    target.write(section.rstrip + "\n")
  end

  puts "split #{sections.length} sections into #{PARTS_DIR}"
end

def merge_items
  paths = part_paths
  if paths.empty?
    panic("expected #{PARTS_DIR} to contain *.yaml files")
  end

  items_yaml_keys = top_level_keys_from_items
  ordered_keys = (items_yaml_keys & paths.keys).uniq + (paths.keys - items_yaml_keys).sort
  ordered_paths = ordered_keys.to_h { |key| [key, paths[key]] }

  fragments = ordered_keys.filter_map do |key|
    path = ordered_paths[key]
    panic("missing part file for top-level key #{key.inspect}") unless path && path.file?
    section_from_part(path)
  end

  if fragments.empty?
    panic("no section data found in #{PARTS_DIR}")
  end

  merged = fragments.join + "\n"
  if load_yaml(ITEMS_PATH) == merge_parts_mapping(ordered_paths)
    puts "#{ITEMS_PATH} already in sync"
    return
  end

  File.write(ITEMS_PATH, merged)
  puts "merged #{ordered_keys.length} files from #{PARTS_DIR} into #{ITEMS_PATH}"
end

def merge_items_strict
  paths = part_paths
  if paths.empty?
    panic("expected #{PARTS_DIR} to contain *.yaml files")
  end

  merged_data = merge_parts_mapping(paths)

  if merged_data == load_yaml(ITEMS_PATH)
    puts "#{ITEMS_PATH} already matches split files"
  else
    puts "#{ITEMS_PATH} differs semantically from split files; run split+manual merge."
  end
end

mode = ARGV[0] || "merge"

case mode
when "split"
  split_items
when "merge"
  merge_items
when "verify"
  merge_items_strict
when "help", "-h", "--help"
  puts "Usage: ruby scripts/sync-items-data.rb [split|merge|verify]"
else
  panic("unknown mode #{mode.inspect}; expected split|merge|verify")
end
