# Assignment 2 solution

The supplied CSV produces **1,535 author nodes and 3,025 distinct coauthor links**, using **554 of 570 publications**. Sixteen publications are excluded: nine have missing author/affiliation fields and seven have at least one name-only affiliation entry. Seven retained authors have an institution but no recognized country; they are colored gray. There are 44 isolated authors, and degrees range from 0 to 44.

## Start here

1. Unzip the complete solution.
2. Open `assignment2/index.html` in Chrome, Edge, Firefox, or Safari. The included local D3 library and data wrapper allow it to run without an internet connection or a Python server.
3. Open `Assignment2_Solution.ipynb` in Jupyter or Google Colab to read the explanation and run the corrected data preparation. It contains executed outputs and validation checks.
4. Keep all website files together. Opening only the HTML file after moving it elsewhere will not work.

## Files

| File | Purpose |
| --- | --- |
| `Assignment2_Solution.ipynb` | Explained solution, original-code review, data preparation, results and checks |
| `prepare_data.py` | Same runnable Python preparation and validation, without Jupyter |
| `data_scopus.csv` | Copy of the supplied input data |
| `author_network.json` | Required author nodes and shared-publication links |
| `author_network.js` | Identical network wrapped as JavaScript for opening HTML directly |
| `cleaning_report.json` | Summary and exact excluded publication IDs with reasons |
| `index.html` | Visualization page structure |
| `styles.css` | Responsive page styling |
| `app.js` | D3 simulation, colors, sizing, interaction, force controls |
| `vendor/d3.v7.min.js` | Local copy of D3 7.9.0 |
| `vendor/D3-LICENSE` | D3 license |
| `.nojekyll` | Static GitHub Pages configuration marker |

## What your original notebook did

Your original code used EIDs as nodes. EIDs identify publications, so it connected papers that had an author in common. The assignment asks for the reverse representation: author IDs as nodes and a connection when two authors wrote a paper together. The corrected notebook explains the other issues, including missing-value handling, substring ID matching, omission of isolated nodes, and the return value of `draw_spring`.

## Running the notebook in Google Colab

1. Open Colab and choose **File → Upload notebook**. Select `Assignment2_Solution.ipynb`.
2. Open the Files panel and upload `data_scopus.csv` into `/content/`.
3. Choose **Runtime → Run all**. The code also accepts `/content/sample_data/data_scopus.csv`.
4. The run writes `author_network.json`, `author_network.js`, and `cleaning_report.json` in the current directory. Download these files if you change the data, then replace their copies in the website folder.

`/content/sample_data/data_scopus.csv` is a file location in Colab. It is not a repository or a website address. Running the notebook prepares the data; opening or hosting `index.html` displays the interactive D3 visualization.

Alternatively, from a terminal in this folder, run `python3 prepare_data.py`. Python's standard library is sufficient.

## How the visualization meets the requirements

| Requirement | Implementation |
| --- | --- |
| Author network JSON | Nodes use Scopus author IDs; links store shared-publication count and IDs |
| Required-field filtering | Reject missing year, author or affiliation, including name-only affiliation entries |
| Top ten country hue | Rank unique authors by primary country; Tableau10 colors for the top ten, `#A9A9A9` for others/unknown |
| Hover | Match normalized complete affiliations; matching nodes use opacity 1, all others 0.2; mouse leave restores 1 |
| Click | Show a tooltip div listing author affiliations and metadata |
| Degree-based node size | `d3.scaleSqrt()` maps the observed degree domain [0, 44] to radii [3, 12] |
| Many-body force | Negative charge, adjusted by the Repulsion slider |
| Collision force | Node radius multiplied by a slider-controlled factor from 1 to 3 |
| Link strength | Slider from 0 to 1 updates the link force |
| Layout | D3 force simulation; responsive CSS flex layout |
| GitHub page | Ready to upload; publication still needs your GitHub account and repository |

For multiple affiliations, primary country is the most frequently observed country with alphabetical tie-breaking. Hover compares complete affiliations after normalizing case and whitespace; it does not infer institutional equivalence between different department/address strings. The notebook documents these assumptions.

## Put the page on GitHub

**Deployment has not been performed.** The remaining hosting step requires your GitHub account.

1. Sign in at GitHub and create a new public repository, for example `assignment2`.
2. Upload the **contents** of the extracted `assignment2` folder into the repository root. Do not upload only the ZIP. Keep the `vendor` folder intact. Make sure `index.html` is at the repository root, not inside another `assignment2` directory.
3. Commit the uploaded files to `main`.
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**. Select **main** and **/(root)**, then save.
6. Wait for GitHub to report deployment success. Open the site URL shown in Pages settings and check the visualization.
7. Submit that live URL, and the notebook/JSON if required by your instructor.

For a repository named `assignment2`, the usual live URL has the form `https://YOUR-USERNAME.github.io/assignment2/`. Replace the placeholder with your actual username; this example is not an already-published site.

GitHub's official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Verification performed

- Executed both notebook code cells from top to bottom in a clean Python namespace and saved their outputs.
- Validated unique node IDs, unique undirected links, absence of self-loops, exact shared-publication membership, and degree totals.
- Opened the page in headless Chrome: 1,535 circles and 3,025 lines rendered, with no page errors.
- Checked hover opacity and restoration, click details, country colors, radius endpoints, slider events and reset behavior.
- Reviewed desktop and mobile screenshots; the mobile page has no horizontal overflow.

## References

- Supplied `Assignment 2.docx`, `data_scopus.csv`, and `Untitled1.ipynb`.
- D3 simulation: https://d3js.org/d3-force/simulation
- D3 many-body force: https://d3js.org/d3-force/many-body
- D3 collision force: https://d3js.org/d3-force/collide
- D3 link force: https://d3js.org/d3-force/link
- Vendored D3 distribution: https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js
