from pathlib import Path

ROOT = Path('src/pages')

replacements = {
    'response rate': 'reply pace',
    'response rates': 'reply pace',
    'track responses': 'see responses',
    'tracking': 'updates',
    'Open tracking': 'Open updates',
    'Click tracking': 'Click updates',
    'Delivery status tracking': 'Delivery status updates',
    'Dietary tracking': 'Dietary details',
    'Allergen tracking': 'Allergy details',
    'Purchase tracking': 'Gift updates',
    'Live capacity tracking': 'Live table count',
    'arrival tracking': 'arrival updates',
    'Generate checklist': 'Create checklist',
    'Generating...': 'Creating...',
    'Generate milestone checklist?': 'Create milestone checklist?',
    'Generate': 'Create',
    'intelligent grouping, permissions, and import/export': 'smart grouping, access rules, and easy import/export',
    'Multi-event permission leakage': 'Multi-event privacy mixups',
    'Event permissions': 'Event access',
    'permissions': 'access rules',
    'prevent leakage': 'keep event details private',
    'conversion': 'engagement',
    'KPI': 'snapshot',
    'CTR': 'click rate',
}

for p in ROOT.rglob('*.tsx'):
    text = p.read_text()
    original = text
    for a,b in replacements.items():
        text = text.replace(a,b)
    if text != original:
        p.write_text(text)
        print(p)
