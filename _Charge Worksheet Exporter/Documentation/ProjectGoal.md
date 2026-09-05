# Project Goal: Charge Worksheet Exporter

We will be taking in an Excel file, processing it and exporting as a JSON file. 

The input excel file will have several tabs, each tab will be a different charge for a different party.
Some tabs (`ALL`, `TEMPLATE`, and `General Plot Info`) will not be used and can be ignored.

We will only be using the first part of each charge tab - up until the "Going into the trial" cell, this marks end of useful information about the charge.

The "Critical" column will describe how many of the pieces of information given by each group are required to be given to the party. The cell in question will be merged over all the members of the group.

For `CriticalAmount`:
- `Yes` = 1
- `at least x` = x 
    
You will output a JSON file named `ChargeTable.json` in an `Output` folder.

## Input format Example:

| Conditions (if any) | Character | Summary | Critical? |
| :--- | :--- | :--- | :--- |
| during 1st Saturday encounter | Kemma Runereader* | meets party and makes connection | |
| Saturday after lunch | Kemma Runereader* | assigns charge | Yes |
| 1st Saturday - Makai who's NOT Toolforger | Kullis Toolforger* | "Nice interaction. He’s never been to Mystal. If they ask, yes, he stole the jewelry & destroyed it—sorry." | Yes |
| | Wren Sorenson* | she tells the whole story of the theft. She is so upset at the loss of Kullis' friendship | Yes |
| | Ray Mulligan | "here's the whole story of Wren discovering her jewelry was missing, someone offering to draw pictures of it, and Toolforger confessing." | at least 2 |
| | Lena Hawk | | |
| | Henri LaFontaine | | |
| | Bitty Smirch | | |
| | Frost | Wren is going to a big fancy wedding in Arkenwold. This will be her first visit there ever. | at least 2 |
| | Mimosa | | |
| | Dominique Bliss | | |
| | Atlantis Pendragon | | |
| | Obsidian* | loss of Kullis as a friend matters more to Wren than the loss of her jewelry. | at least 2 |
| | Trina Sunday | | |
| | Harrison Armstrong | | |
| | Kerrick Dealbinder* | Kullis and Wren were very close | at least 2 |
| | Ophelia Glen | | |
| | Sonja Eastwind | | |
| | Kira | Kullis is such a good person. Impossible to believe he'd steal. | at least 1 |
| | Etta Mae Stapleton | | |
| on party's path | Kazmira* | Kazmira cleans house for Wren. Wren plans to make jelly when she gets home from the wedding | Yes |
| | Denison Bannister | Wren plans to make jelly when she gets home from the wedding | at least 1 |
| | John Doe | | |
| | Fuchsia | "Wren never traveled with Simon on his work trips. Simon wasn't mean to Wren, but he wasn't big on spending time with her, either" | at least 2 |
| | Christophe Valerius | | |
| | Astrid Holt | | |
| | Crabtree | | |
| | Kullis Tootforger* | not out Saturday after 4pm except at 8pm meeting | |
| Saturday 6-8pm (still?) | Daphne Dalrymple | she had jewelry stolen a decade ago. She describes it in detail | Yes |
| Saturday 6-8pm (still?) | Kiko Truthspeaker* | "Kullis told Simon, “You need to tell her!” before Simon died." | |
| Sunday am | keeper's vision | "The vision shows Toolforger in Wren’s kitchen, hiding the jewels rather than stealing them, in order to protect her." | |
| Sunday after path ending | Kazmira* | Jewelry was hidden in Wren’s sugar sack. (Shows jewelry.) | Yes |
| | traveler lore | Lion & Laurel were stolen from Mystal years ago. | |
| | Kullis Toolforger* | not out Sunday till trial | |
| | Wren Sorenson* | not out Sunday till trial | |
| pre-trial check-in | | - Kullis didn't steal Wren's jewelry, but he did hide it all in her sugar canister, knowing she'd find it when she went to make jelly after returning from the wedding<br>- Wren's late husband Simon was a jewel thief, not a merchant at all, and all Wren's jewelry was stolen from people in Mystal*<br>- Kullis hid the jewelry to prevent Wren from wearing it to the upcoming wedding in Mystal, where it would certainly be recognized and where she would be publically shamed, and he's continuing to assert his guilt to keep her from learning the truth about SImon | Yes |

## Output format:

```json
{
  "Charges": [
    {
      "Title": "",
      "Party": "",
      "Groups": [
        {
          "Summary": "",
          "CriticalAmount": "",
          "Characters": [
            {
              "CharacterName": "",
              "Conditions": ""
            }
          ]
        }
      ]
    }
  ]
}
```
