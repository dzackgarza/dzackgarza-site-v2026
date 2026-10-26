// Site-owned collection island. Hydrates the `.collection` mount the Lua
// `collection` component emits, reading the per-key items JSON URL from
// data-collection. Owned here (not the generator) so the listing's presentation
// — per-item tag chips, entry separators — is a site/content concern.
import { mount } from "svelte";
import Collection from "./Collection.svelte";

let el = document.querySelector<HTMLElement>(".collection");
if (!el) {
  throw new Error("collection island: no .collection mount point found");
}

let dataUrl = el.dataset.collection;
if (!dataUrl) {
  throw new Error("collection island: mount point is missing its data-collection attribute");
}

mount(Collection, { target: el, props: { dataUrl } });
