# NutriTrack

App desktop de acompanhamento nutricional (Windows).

## Stack

- Electron + React + TypeScript + Vite
- SQLite via `sql.js`
- Dados locais no `D:`

## Pastas no D:

- Projeto: `D:\Projetos\AcompanhamentoNutricional`
- Dados (dev): `.\data`
- Dados (instalado): `D:\NutriTrack\data`
- npm cache: `D:\temp\npm-cache`
- Electron cache: `D:\temp\electron-cache`
- electron-builder cache: `D:\temp\electron-builder-cache`
- Instalador gerado: `.\release`

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build do instalador Windows

```bash
npm run dist:win
```

O setup sai em `D:\Projetos\AcompanhamentoNutricional\release\NutriTrack-Setup-0.1.0.exe`.

Na instalação, escolha uma pasta no **D:** (ex.: `D:\Programas\NutriTrack`).

## Setup obrigatório

Cada perfil precisa cadastrar **dieta** e **peso** antes de liberar Registrar, Andamento e Dashboard.
