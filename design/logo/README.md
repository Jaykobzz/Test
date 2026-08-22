# Appmärket

`HAKA` över `PÅ`, båda raderna centrerade med normal spärr, mot Bryggans gran.
Ringen på Å är i den brända accenten.

## Tre beslut

**Raderna är inte utsträckta till samma bredd.** Första förslaget spärrade ut
`PÅ` tills det matchade `HAKA`, vilket är den vanliga lösningen på ett tvåradigt
märke. Men att spärra ett tvåbokstavsord till fyra bokstävers bredd gör `P Å`
till två bokstäver i stället för ett ord. Centrerat och ospärrat läser det som
det ska, även om högerkanten blir ojämn.

**PÅ är inte större än HAKA.** Testat, och det ser bra ut i stort format, men
Å-ringen behöver höjd. Förstoras raden kolliderar ringen med `HAKA` ovanför.

**Ringen bär accenten.** Den är det enda runda i ett annars kantigt märke, och
den enda detaljen som tål en egen färg utan att märket blir spretigt. Att
accenten sitter där löser två saker samtidigt: märket blir inte enfärgat, och
Å:et går från problem till kännetecken.

## Filer

```
render.py         märket i varianter och storlekar --> varianter.png
build_assets.py   de tre assetfilerna --> mobile/assets/
```

Ringen ritas som en egen cirkel, inte som tecknet Å. Positionen är uppmätt ur
Unbounded genom att rendera `PÅ` och `PA` med allt annat identiskt och jämföra
bilderna: pixlarna som skiljer är ringen. Konstanterna står i `render.py`.

## Assetkrav

| Fil | Krav |
|---|---|
| `icon.png` | Fylld fyrkant utan egna hörn. iOS lägger på sin egen mask; ritar man in radien får man en rundad ikon inuti en rundad mask. |
| `adaptive-icon-foreground.png` | Genomskinlig, motivet innanför 62 % av ytan. Android maskar olika hos olika tillverkare. Bakgrunden sätts i `app.json`. |
| `splash-icon.png` | Genomskinlig. `app.json` målar granen bakom. |

Testet är 29 px. Ett märke som bara håller på 1024 är en affisch.
