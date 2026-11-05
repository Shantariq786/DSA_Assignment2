"""Build an undirected AUTHOR co-publication network using Python's standard library."""
import csv
import json
import re
from pathlib import Path
from collections import Counter, defaultdict
from itertools import combinations

# Use the CSV beside this script/notebook; the second path supports Google Colab.
DATA_PATH = next((p for p in [Path('data_scopus.csv'),
    Path('/content/sample_data/data_scopus.csv'), Path('/content/data_scopus.csv')]
    if p.exists()), None)
if DATA_PATH is None:
    raise FileNotFoundError('Place data_scopus.csv beside this notebook, or upload it to Colab.')

# Country labels present in this export. Never treat a trailing institution/name as a country.
COUNTRIES = set('United States|Germany|China|United Kingdom|South Korea|Canada|Brazil|Russian Federation|Japan|Spain|France|Australia|Italy|Czech Republic|Austria|Taiwan|Poland|Sweden|Netherlands|India|Portugal|Finland|Switzerland|Greece|Belgium|Ireland|Iran|Tunisia|Norway|Romania|Colombia|Denmark|Philippines|Thailand|Hong Kong|Mexico|Turkey|Singapore|Lithuania|Malaysia|Pakistan|Slovakia|Chile|Saudi Arabia|Kazakhstan|Croatia|Latvia|Serbia|Bulgaria|Trinidad and Tobago|New Zealand|Israel|Egypt|Iraq|Indonesia|Gabon|Hungary|Lebanon|Ecuador|Qatar|Algeria'.split('|'))

def missing(value):
    return not value or value.strip().casefold() in {'nan', 'none', '[no author name available]'}

def parse_authors(row):
    # The semicolon-separated affiliation entries align with the Scopus author IDs.
    # The Authors column cannot safely be split on commas because of Jr. and II.
    ids = [s.strip() for s in row['Author(s) ID'].split(';') if s.strip()]
    entries = [s.strip() for s in row['Authors with affiliations'].split(';') if s.strip()]
    if len(ids) != len(entries) or not ids:
        raise ValueError('Author ID and affiliation entry counts do not match')
    people = []
    for author_id, entry in zip(ids, entries):
        parts = [s.strip() for s in entry.split(',')]
        if len(parts) < 3:
            raise ValueError('At least one author has no affiliation (name-only entry)')
        name = parts[0] + ', ' + parts[1]
        start = 2
        if parts[2].rstrip('.') in {'Jr', 'Sr', 'II', 'III', 'IV'}:
            name += ', ' + parts[2]
            start = 3
        affiliation = ', '.join(parts[start:]).strip(' ,')
        if missing(affiliation):
            raise ValueError('At least one author has no affiliation')
        # Search all components: several entries have an employer after the country.
        countries = sorted({p for p in parts[start:] if p in COUNTRIES})
        people.append((author_id, name, affiliation, countries))
    return people

with DATA_PATH.open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))
authors = {}
edge_papers = defaultdict(set)
retained = []
excluded = []
seen = set()
for row in rows:
    eid = row['EID'].strip()
    absent = [key for key in ['Year', 'Authors', 'Authors with affiliations'] if missing(row[key])]
    reason = 'Missing required field(s): ' + ', '.join(absent) if absent else None
    if not reason and not re.fullmatch(r'\d{4}', row['Year'].strip()):
        reason = 'Invalid year'
    if not reason and eid in seen:
        reason = 'Duplicate publication EID'
    if not reason:
        try:
            people = parse_authors(row)
        except ValueError as error:
            reason = str(error)
    if reason:
        excluded.append({'eid': eid, 'reason': reason})
        continue
    seen.add(eid)
    year = int(row['Year'])
    retained.append({'id': eid, 'title': row['Title'], 'year': year})
    for author_id, name, affiliation, countries in people:
        a = authors.setdefault(author_id, {'names': Counter(), 'affiliations': set(),
            'country_votes': Counter(), 'papers': set(), 'years': set()})
        a['names'][name] += 1
        a['affiliations'].add(affiliation)
        a['country_votes'].update(countries)
        a['papers'].add(eid)
        a['years'].add(year)
    # Unique pairs prevent self-loops and duplicate edges within a paper.
    for source, target in combinations(sorted({p[0] for p in people}), 2):
        edge_papers[source, target].add(eid)

def mode(counter):
    return sorted(counter, key=lambda key: (-counter[key], key))[0] if counter else 'Unknown'

links = [{'source': s, 'target': t, 'weight': len(papers), 'publications': sorted(papers)}
         for (s, t), papers in sorted(edge_papers.items())]
degrees = Counter()
for edge in links:
    degrees.update([edge['source'], edge['target']])
nodes = [{'id': aid, 'name': mode(a['names']), 'affiliations': sorted(a['affiliations']),
          'affiliationKeys': sorted({re.sub(r'\s+', ' ', v).strip().casefold() for v in a['affiliations']}),
          'country': mode(a['country_votes']), 'countries': sorted(a['country_votes']),
          'degree': degrees[aid], 'publicationCount': len(a['papers']),
          'publications': sorted(a['papers']), 'years': sorted(a['years'])}
         for aid, a in sorted(authors.items())]
country_counts = Counter(n['country'] for n in nodes if n['country'] != 'Unknown')
top10 = sorted(country_counts, key=lambda c: (-country_counts[c], c))[:10]
metadata = {'inputRecords': len(rows), 'retainedPublications': len(retained),
            'excludedRecords': len(excluded), 'authorCount': len(nodes),
            'linkCount': len(links), 'topCountries': top10,
            'countryCounts': dict(country_counts.most_common()),
            'unknownCountryAuthors': sum(n['country'] == 'Unknown' for n in nodes),
            'degreeRange': [min(n['degree'] for n in nodes), max(n['degree'] for n in nodes)]}
graph = {'nodes': nodes, 'links': links, 'publications': retained, 'metadata': metadata}
Path('author_network.json').write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding='utf-8')
# The JS wrapper lets index.html also work when opened directly without a server.
Path('author_network.js').write_text('window.AUTHOR_NETWORK = ' + json.dumps(graph, ensure_ascii=False) + ';\n', encoding='utf-8')
Path('cleaning_report.json').write_text(json.dumps({'summary': metadata, 'excluded': excluded}, indent=2), encoding='utf-8')
print(json.dumps(metadata, indent=2))

# Verify graph structure and publication membership, not only file creation.
node_by_id = {n['id']: n for n in nodes}
assert len(node_by_id) == len(nodes)
assert len({(e['source'], e['target']) for e in links}) == len(links)
for e in links:
    assert e['source'] != e['target']
    shared = set(node_by_id[e['source']]['publications']) & set(node_by_id[e['target']]['publications'])
    assert set(e['publications']) == shared
    assert e['weight'] == len(shared)
assert sum(n['degree'] for n in nodes) == 2 * len(links)
assert all(n['affiliations'] and n['years'] and n['name'] for n in nodes)
assert len(rows) == len(retained) + len(excluded)
print('All validation checks passed.')
print('Isolated authors:', sum(n['degree'] == 0 for n in nodes))
print('Excluded publication reasons:', dict(Counter(e['reason'] for e in excluded)))
