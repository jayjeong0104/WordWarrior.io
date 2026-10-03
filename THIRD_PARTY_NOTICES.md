# Third-party notices

This project retains the original KKuTu credits and licenses. Individual data,
fonts, and other third-party components retain their own terms; the source-code
license does not grant additional rights to those components.

## KKuTu

- Original creator: **JJoriping** (`op@jjo.kr`), Copyright (C) 2017.
- Original project: [JJoriping/KKuTu](https://github.com/JJoriping/KKuTu).
- Source license: [GNU General Public License, version 3](LICENSE). Original
  source headers permit version 3 or, at the recipient's option, any later version.
- The original README credits Sandbox (SDBX), SWMaestro, and contributors/users.

The upstream README licenses its original images and sounds under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/),
with an attribution exception when those assets are used to operate a KKuTu
service using the supplied source. That statement concerns the upstream assets;
it does not establish licenses for subsequently added fonts or other material.

## Dictionary data

The bundled English dictionary includes **WordNet 3.0**, Copyright 2006 by
**Princeton University. All rights reserved.** Its separate copyright, terms,
and disclaimer are published in Princeton's
[WordNet license](https://wordnet.princeton.edu/license-and-commercial-use).
The repository's existing dictionary credits also identify the **National
Institute of Korean Language Standard Korean Language Dictionary**.

Dictionary attribution is retained in `Server/lib/Web/lang/en_US.json`,
`Server/lib/Web/lang/ko_KR.json`, and the original README. Princeton's terms
require the copyright notice, statements, and disclaimer to accompany copies of
the software, database, and documentation, including modified copies. The full
WordNet 3.0 license is reproduced below. Database records and external dictionary
sources should not be treated as covered solely by the source-code GPL license.

## Font Awesome

`Server/lib/Web/public/css/fa.css` retains the following upstream notice:

> Font Awesome 4.5.0 by @davegandy — http://fontawesome.io — @fontawesome

Its notice specifies **SIL Open Font License 1.1** for the font and **MIT License**
for the CSS. The bundled font is
`Server/lib/Web/public/media/fontawesome-webfont.woff`.
See [Font Awesome's license information](https://fontawesome.com/v4/license/).

## Additional font metadata

These entries record the metadata embedded in the files. They do not substitute
for the font-specific license or establish a redistribution grant.

| File in `Server/lib/Web/public/media/` | Embedded attribution and license metadata |
| --- | --- |
| `supercell-magic.ttf` | Family: Supercell-Magic. Copyright (c) 2017 by Supercell. All rights reserved. Manufacturer: Supercell. Designer: John Roshell. |
| `JungleAdventurer.ttf` | Family: Jungle Adventurer. Copyright/manufacturer: TKK Studio. Designer: Sahirul. License description: Commercial License. License/vendor URL: https://justtheskills.com/vendor/tokokoo/. |

No accompanying redistribution license for either additional font was found in
the active source tree or its archived original copy. Their embedded notices
remain intact; the original KKuTu asset license does not establish their terms.

## Demo material

The offline demo uses fictional player and conversation data, local game assets,
and the supplied screenshot background. Its capture and fixture provenance is
documented in [the screenshot gallery](docs/screenshots/README.md). The captures
do not change the applicable rights of the artwork and fonts they display.

## WordNet 3.0 license

Source: Princeton University's official
[WordNet license text (wnlicens)](https://wordnet.princeton.edu/documentation/wnlicens7wn),
verified against its
[License and Commercial Use page](https://wordnet.princeton.edu/license-and-commercial-use)
on October 3, 2026. Paragraph and line wrapping are normalized below.

```text
WordNet Release 3.0

This software and database is being provided to you, the LICENSEE, by Princeton University under the following license.

By obtaining, using and/or copying this software and database, you agree that you have read, understood, and will comply with these terms and conditions.:

Permission to use, copy, modify and distribute this software and database and its documentation for any purpose and without fee or royalty is hereby granted, provided that you agree to comply with the following copyright notice and statements, including the disclaimer, and that the same appear on ALL copies of the software, database and documentation, including modifications that you make for internal use or for distribution.

WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.

THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED.

BY WAY OF EXAMPLE, BUT NOT LIMITATION, PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANT- ABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.

The name of Princeton University or Princeton may not be used in advertising or publicity pertaining to distribution of the software and/or database.

Title to copyright in this software, database and any associated documentation shall at all times remain with Princeton University and LICENSEE agrees to preserve same.
```
