# Monochrome chart palette: CVD separation passes on luminance alone; chroma floor is a deliberate spec-driven violation; one contrast WARN remediated.

Ran the dataviz palette validator on the chart ramp
`#fafafa, #a3a3a3, #737373, #525252` against the dark surface:

- **CVD separation: PASS** — worst adjacent pair ΔE 13.6 (deutan/tritan/normal
  identical, as expected for zero-chroma colors). Luminance spacing alone
  clears the ≥ 12 target, so the monochrome ramp is legitimately
  distinguishable.
- **Chroma floor: FAIL (accepted deviation)** — every slot reads "gray"
  because every slot *is* gray. The product spec mandates a strictly
  monochromatic palette, so this check is knowingly violated. Compensating
  controls per the design method: series identity never rides on color alone —
  legend always present, distinct line styles (solid/dashed/weight), selective
  direct end labels, and all key values duplicated in KPI tiles and tables.
- **Contrast vs surface: WARN** — `#525252` is 2.23:1 (< 3:1). Remediation:
  the contributed-principal series uses `#737373` instead; `#525252` is
  reserved for the dashed FIRE-target threshold, which carries its own text
  label and is duplicated as a KPI value (relief via visible labels).

Rule of thumb worth keeping: when a brand constraint forbids hue, buy the
distinguishability with luminance steps of roughly ≥ 0.13 L* and mandatory
secondary encoding, then document the deviation instead of pretending the
check passed.
