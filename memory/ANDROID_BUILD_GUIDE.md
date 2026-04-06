# FRIKT - Guía Completa de Build Android (EAS)

## Datos Clave del Proyecto
- **Package name:** `au.path.gro`
- **Bundle Identifier iOS:** `com.frikt.app`
- **EAS Project ID:** `ff463fc7-b0b7-4d17-a714-726b6d3d12b1`
- **Expo Account:** `karolisb`
- **GitHub Repo:** `karolisbudreckas92-sys/frikt-backend`
- **Keystore:** `PathGro-Original` (legacy `app.jks`, configurado en EAS credentials)
- **Firebase:** `google-services.json` en `frontend/` (para Android)

---

## Checklist ANTES de hacer build Android

### 1. Archivos obligatorios
- [ ] `frontend/google-services.json` existe
- [ ] `frontend/google-services.json` NO esta en `.gitignore`
- [ ] `frontend/app.json` tiene `"package": "au.path.gro"`
- [ ] `frontend/app.json` tiene `"googleServicesFile": "./google-services.json"`
- [ ] NO existe carpeta `frontend/android/` (EAS la genera remotamente)
- [ ] NO existe carpeta `frontend/ios/` (EAS la genera remotamente)

### 2. Keystore
- Ya configurado como `PathGro-Original` en EAS credentials remotas
- NO tocar ni reconfigurar a menos que haya un problema especifico
- Si se necesita reconfigurar: `eas credentials --platform android`

### 3. Version
- `versionCode` se maneja remotamente por EAS (se autoincrementa)
- `version` en `app.json` es la version visible (ej: "1.0.4")
- El campo `android.versionCode` en `app.json` es ignorado por EAS remote versioning

---

## Pasos para Build Android (para el usuario)

### Paso 1: Save to GitHub en Emergent
- Click en "Save to GitHub" en el chat de Emergent
- Esperar confirmacion

### Paso 2: Terminal en Mac
```bash
cd ~/frikt-app/frontend
git pull origin main
```

Si hay conflicto con archivos locales:
```bash
git stash
git pull origin main
git stash pop
```

Si `git stash` falla por archivos nuevos:
```bash
git add -A
git commit -m "Local changes"
git pull origin main --no-rebase
```

Si se abre vim (editor de texto con ~ en pantalla):
- Presionar `Esc`
- Escribir `:wq`
- Presionar `Enter`

### Paso 3: Limpiar carpetas nativas
```bash
rm -rf android ios
```

### Paso 4: Build
```bash
eas build --platform android
```
- Esperar 10-15 minutos
- Al final da un link `.aab` para descargar

### Paso 5: Subir a Google Play
1. Ir a https://play.google.com/console
2. Seleccionar app FRIKT
3. Menu izquierdo: Production > Create new release
4. Subir el archivo `.aab` descargado
5. Release notes:
```
<en-US>
Bug fixes and performance improvements.
</en-US>
```
6. Review release > Start rollout

---

## Errores Comunes y Soluciones

### Error: "File google-services.json is missing"
**Causa:** El archivo esta en `.gitignore` y EAS no lo sube al servidor remoto.
**Solucion:** Quitar `google-services.json` del `.gitignore` y hacer commit del archivo.

### Error: "non-fast-forward" en git push
**Causa:** La rama local esta detras de la remota.
**Solucion:**
```bash
git pull origin main --no-rebase --allow-unrelated-histories
git push origin main
```

### Error: Package name incorrecto (com.frikt.app en vez de au.path.gro)
**Causa:** `app.json` tiene el package name equivocado.
**Solucion:** Verificar que `app.json` > `android` > `package` sea `"au.path.gro"`.

### Error: Keystore incorrecto / nuevo keystore generado
**Causa:** EAS genero un keystore nuevo en vez de usar el legacy.
**Solucion:**
```bash
eas credentials --platform android
```
Seleccionar "PathGro-Original" o subir `app.jks` de nuevo.

### Error: "Your local changes would be overwritten by merge"
**Causa:** Hay cambios locales sin commitear.
**Solucion:**
```bash
git add -A
git commit -m "Local changes before pull"
git pull origin main --no-rebase
```

---

## Notas para el Agente (Emergent)

### REGLAS CRITICAS:
1. **NUNCA** agregar `google-services.json` al `.gitignore`
2. **NUNCA** crear carpeta `android/` o `ios/` en el repo - EAS las genera remotamente
3. El package name Android es `au.path.gro`, NO `com.frikt.app`
4. El keystore `PathGro-Original` ya esta configurado en EAS - no tocar
5. `versionCode` se maneja remotamente - no cambiar manualmente en `app.json`
6. El usuario NO es programador - dar instrucciones paso a paso con comandos exactos para copiar y pegar
7. Si hay conflictos de git, guiar con comandos simples (stash/pull/pop o add/commit/pull)
8. Siempre verificar que el `.gitignore` no bloquee archivos necesarios para el build

### Estructura de archivos relevantes:
```
frontend/
  app.json                  # Config principal (package name, version, plugins)
  eas.json                  # Config de EAS builds (profiles)
  google-services.json      # Firebase config para Android (DEBE estar en git)
  .gitignore                # google-services.json NO debe estar aqui
  assets/
    fonts/                  # Fuentes locales (Plus Jakarta Sans)
    images/                 # Iconos, splash, etc.
```

### Credenciales EAS:
- Login: `eas login` (cuenta: karolisb)
- Ver credentials: `eas credentials --platform android`
- El token de GitHub del usuario es un Personal Access Token (ghp_...)
