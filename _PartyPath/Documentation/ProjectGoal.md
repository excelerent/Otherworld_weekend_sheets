We are looking to create a tool which will read from the handbook and generate a spreadsheet of each party's Party Path.
A Party path is a list of the characters that each party will need to engage with to get information or items in order to complete the adventure weekend.

This is for a Live Action Game called "Otherworld" where 11 parties of 6 participants will engage with a world made up of over 100 staff characters, each path is different but follows a general pattern.

In general a party path consists of:
1. **Friday Night Encounters**, separated into Contact, 2nd, 3rd, and 4th Encounters.
    1. **Contact**: greets the party, introduces them to their companion (A staff member).
    2. **2nd Encounter**: Fills time and gets the party used to interacting with staff characters.
    3. **3rd Encounter**: Takes the party out of the tavern to a set location.
    4. **4th Encounter**: Gives the party a list of items they need to find and a way to complete their adventure.
2. **Saturday Encounters**:
    1. **1st Saturday**: The first scheduled encounter on Saturday morning.
    2. **Unscheduled Saturday Encounters**: Encounters that can happen throughout the day, each giving the party an item from their list.
    3. **NOTE**: one Saturday encounter will involve the "Cup of Insight" challenge - this is a special encounter.
3. **Sunday Morning Encounters**:
    1. **Penultimate Step**: This encounter usually involves a staff character who cannot give the item to the party on saturday (this is to hold them from completing their goal til sunday)
    2. **Final Step**: This is the ritual That (now that the party has all their items) they can complete.

### Output Format

The tool outputs the data to both CSV and JSON formats.

#### Spreadsheet (CSV) Format:
The spreadsheet generates a list of encounters for each party. Note that the CSV currently only contains the base encounter information.

| Party | Staff Member | Time | Item to Give |
| :--- | :--- | :--- | :--- |
| Arden | Aria Morgan | Contact | -- |
| Arden | Ursula Smirch | 2nd Friday | -- |
| Arden | Nix Valerius | 3rd Friday | -- |
| Arden | Isaiah Cooke | 4th Friday | list of items |
| Arden | Kiko Truthspeaker | 1st Saturday | locus root |
| Arden | Pascal Valerius | 8am-1pm | star of direction |
| Arden | Karmin Smirch | 9-11am, 1-4pm, 6-8pm | riverglass jewelbox |
| Arden | Valentina | 10am-4pm | citrine shards |
| Arden | Charlie Peacock | 1-6pm | cowry shell |
| Arden | Moxie | 10am-5pm | riddle to argentum heart |
| Arden | Obsidian | 8am-12noon, 2-4pm | spiritstone |
| Arden | Ghost Theater | 4-8pm | limelight |
| Arden | Buzzkill | 9:45am Sunday | chaos pendant |
| Arden | Morgoth & Henchmen | 10am Sunday | Sconce of the Wood |
| Arden | riddle item found? | -- | -- |

- **Party**: The name of the party (11 unique parties).
- **Staff Member**: The staff member name (or a challenge, such as the "Ghost Theatre" or "Gauntlet").
- **Time**: The time of the encounter.
- **Item to Give**: The item given to the party (may be blank).

#### JSON Format:
The JSON file contains a flat array of all encounters, including additional metadata flags used by downstream tools.

```json
[
  {
    "party": "Arden",
    "staff": "Kiko Truthspeaker",
    "time": "1st Saturday",
    "item": "locus root",
    "PathItem": true
  },
  {
    "party": "Arden",
    "staff": "Moxie",
    "time": "10am-5pm",
    "item": "riddle to argentum heart",
    "PathItem": true,
    "Riddle": true
  }
]
```

**Metadata Flags:**
- **PathItem**: (boolean) True if the encounter gives a specific item from the party's list. This flag is exclusive to **Saturday** encounters.
- **Insight**: (boolean) True if the encounter is for the "Cup of Insight" challenge (pulled from the "Activity/Goals" section).
- **Riddle**: (boolean) True if the encounter involves a riddle or gives a riddle-related item.

### Data Source
We will be using the handbook to generate this spreadsheet, which is in a PDF format.
The handbook is available here: `Handbook/2026-only-party-paths.pdf`
(Note: Handbook location may vary, default is relative to the tool script).

### Steps to Generate
1. Read the `Examples/Glendeep.pdf` file to understand the format of the handbook, save this format as a reference.
2. Create a Javascript/Typescript program to read the PDF and extract the text from the handbook.
    a. Use the Format example to understand the format of the handbook.
    b. Find the beginning of the party path section (Party Paths Heading)
    c. For each party path, read the name of the party, and find Contact, Friday Night Encounters, Unscheduled Saturday Encounters, and Sunday Morning Encounters.
    d. Output these to a spreadsheet (CSV) and a JSON file.
3. Save the outputs in a folder called `Output`.
4. Extract metadata flags (`PathItem`, `Insight`, `Riddle`) for use in downstream dashboard and tracking tools.
