"""Dev tool (not shipped to players): Flesch-Kincaid grade per text group in content.json / playhouse.json.
Usage: python3 tools/readability.py [--list GROUP]   Target: core text <= 4.5, glossary <= 5 (EDU-02)."""
import json, re, sys

def syllables(word):
    w = word.lower().strip(".,!?;:'\"()")
    if not w: return 0
    n = len(re.findall(r'[aeiouy]+', w))
    if w.endswith('e') and n > 1 and not w.endswith('le'): n -= 1
    return max(1, n)

def fk(text):
    sentences = max(1, len(re.findall(r'[.!?]+', text))); words = text.split()
    if not words: return 0.0, 0.0
    return round(0.39 * len(words) / sentences + 11.8 * sum(map(syllables, words)) / len(words) - 15.59, 1), round(len(words) / sentences, 1)

def groups():
    c = json.load(open('content.json')); p = json.load(open('playhouse.json'))
    steps = [s for sc in p['scenarios'] for s in sc['steps']]
    return {
        'goalShort': [a['goalShort'] for a in c['activities']],
        'whatHappened': [a['whatHappened'] for a in c['activities']],
        'realLife': [a['realLife'] for a in c['activities']],
        'regions': [r['description'] for r in c['regions']],
        'stages': [s['description'] for s in c['stages']],
        'neuronLevels': [l['goal'] + ' ' + l['explain'] for l in c['neuronLevels']],
        'quiz.explanation': [q['explanation'] for q in c['quiz']],
        'quiz.why': [q[k] for q in c['quiz'] for k in ('other1Why', 'other2Why') if q.get(k)],
        'playhouse.steps': [s['text'] for s in steps],
        'playhouse.funFacts': [s['funFact'] for s in steps if s.get('funFact')],
        'glossary': [g['description'] for g in c['glossary']],
    }

if __name__ == '__main__':
    g = groups()
    if len(sys.argv) > 2 and sys.argv[1] == '--list':
        for i, t in enumerate(g[sys.argv[2]]): print(i, fk(t)[0], t)
    else:
        for k, v in g.items():
            grade, wps = fk(' '.join(v)); print(f'{k:20s} FK {grade:5} | words/sentence {wps}')
