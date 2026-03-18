import re

filepath = r"c:\Users\jabam\OneDrive\Desktop\MARTE\src\App.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('import { useEffect } from "react";', 'import { Suspense, lazy, useEffect } from "react";')

def replace_import(import_statement):
    if "components/" in import_statement or "stores/" in import_statement or "hooks/" in import_statement:
        return import_statement
    
    named_match = re.match(r'import\s+\{\s*([A-Za-z0-9_]+)\s*\}\s+from\s+[\'"](.*)[\'"];', import_statement)
    if named_match:
        name = named_match.group(1)
        path = named_match.group(2)
        return f"const {name} = lazy(() => import('{path}').then(module => ({{ default: module.{name} }})));"
    
    default_match = re.match(r'import\s+([A-Za-z0-9_]+)\s+from\s+[\'"](.*)[\'"];', import_statement)
    if default_match:
        name = default_match.group(1)
        path = default_match.group(2)
        return f"const {name} = lazy(() => import('{path}'));"
        
    return import_statement

lines = content.split('\n')
new_lines = []
for i, line in enumerate(lines):
    if 13 <= i <= 81 and line.startswith('import '):
        new_lines.append(replace_import(line))
    else:
        new_lines.append(line)

new_content = '\n'.join(new_lines)

suspense_fallback = '''<Suspense fallback={
                <div className="flex h-[50vh] w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-sm border-primary text-muted-foreground" style={{borderTopColor: "transparent"}}>იტვირთება...</p>
                  </div>
                </div>
              }>'''

# Wrap <Routes> with <Suspense>
if '<Routes>' in new_content:
    new_content = re.sub(
        r'(<Routes>.*?</Routes>)',
        f'{suspense_fallback}\n                \\1\n              </Suspense>',
        new_content,
        flags=re.DOTALL
    )

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)
    
print("Successfully refactored App.tsx")
