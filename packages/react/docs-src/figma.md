## Implementing a Figma design

{{name}}'s Figma components and their properties share these components' and props' names, so map them by name. Through the Figma MCP server:

- An instance whose overrides are only text and boolean properties arrives as a call, such as `<Button children="Save changes" icon />`, with Figma's property names. Variant values are strings, and `"true"` and `"false"` become booleans.
- A boolean that shows a nested icon, such as `Button`'s `icon`, stands for a prop that takes an icon component. Pass the glyph the design shows: a glyph arrives as `<CloseIcon />`.
- An instance with a swapped nested instance, or with an instance-swap property set, arrives as markup marked `data-name="Button"`. Rebuild it as that component.
- A frame bound to variables arrives with values such as `var(--{{prefix}}-space-m, 16px)`. Build it with `Box` or `Stack`, passing the token keys those variables name (`gap="m"`), and drop the fallbacks.
