#!/usr/bin/env ruby
# Sync content/_data/items.yaml and per-file parts under content/_data/items.

require "yaml"
require "pathname"

DATA_DIR = Pathname.new("content/_data")
ITEMS_PATH = DATA_DIR / "items.yaml"
PARTS_DIR = DATA_DIR / "items"

def panic(msg)
  warn "sync-items-data: #{msg}"
  exit 1
end

def load_yaml(path)
  data = YAML.load_file(path)
  panic("#{path} did not contain YAML data") if data.nil?
  data
end

def split_items
  sections = load_yaml(ITEMS_PATH)
  unless sections.is_a?(Hash)
    panic("expected #{ITEMS_PATH} to be a YAML mapping")
  end
  PARTS_DIR.mkpath

  sections.each do |key, value|
    target = PARTS_DIR / "#{key}.yaml"
    File.write(target, ({ key => value }).to_yaml)
  end

  puts "split #{sections.keys.length} sections into #{PARTS_DIR}"
end

def merge_items
  unless PARTS_DIR.directory?
    panic("expected #{PARTS_DIR} to exist")
  end

  merged = {}
  Dir[PARTS_DIR.join("*.yaml")].sort.each do |path|
    file_data = load_yaml(path)
    unless file_data.is_a?(Hash)
      panic("#{path} must contain a YAML mapping")
    end
    if file_data.length != 1
      panic("#{path} must contain exactly one top-level key")
    end

    key, value = file_data.first
    if merged.key?(key)
      panic("duplicate top-level key #{key.inspect} found in #{path}")
    end
    merged[key] = value
  end

  File.write(ITEMS_PATH, merged.to_yaml)
  puts "merged #{merged.keys.length} files from #{PARTS_DIR} into #{ITEMS_PATH}"
end

mode = ARGV[0] || "merge"

case mode
when "split"
  split_items
when "merge"
  merge_items
when "help", "-h", "--help"
  puts "Usage: ruby scripts/sync-items-data.rb [split|merge]"
else
  panic("unknown mode #{mode.inspect}; expected split|merge")
end
