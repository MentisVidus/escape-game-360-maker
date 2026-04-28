# Référence actions V2 ↔ legacy

Référence durable pour C7.3+ : liste des actiontypes (`msg`, `pick`, `goto`, `req`, `pwd`, `selector`), champs V2, et correspondances legacy.

Sources techniques :
- `js/editor-shared-action-mappers.js`
- `js/editor-shared-hotspot-dom-mapper.js`
- `xflow/react/src/serialize/toProjectJson.ts`

## Convention

- **V2 (nodal)** : `action.type`, `action.payload`, `action.sfx`, `action.visibility`
- **Legacy (DOM/formulaire)** : préfixes `f_*` dans les blocs hotspot
- Compat :
  - la nodale manipule `type: "goto"`
  - le legacy utilise historiquement `type: "scene"`

## Champs communs (toutes actions)

| V2 | Legacy hotspot | Notes |
|---|---|---|
| `sfx.url` | `f_sfx_url` | SFX action |
| `sfx.volume` | `f_sfx_vol` | Volume SFX |
| `visibility.requiresItem` | `f_hs_req_item` | Item requis |
| `visibility.hiddenIfHasItem` | `f_hs_hidden_if` | Cacher si item possédé |
| `visibility.clickWhenInvisible=false` | `f_hs_ghost_click="no"` | Ghost click |

---

## `msg`

| V2 | Legacy hotspot | Legacy choice/reward |
|---|---|---|
| `type: "msg"` | `type: "msg"` | `actionType: "msg"` |
| `payload.copy.bodyHtml` | `f_txt` | `txt` / `f_ok_msg` (dans reward req/pwd) |
| `payload.copy.buttonLabel` | *(non utilisé runtime msg actuel)* | *(souvent non exploité en legacy msg)* |

---

## `pick`

| V2 | Legacy hotspot | Legacy choice/reward |
|---|---|---|
| `type: "pick"` | `type: "pick"` | `actionType: "pick"` |
| `payload.itemId` | `f_item_id` | `itemId` / `f_pick_id` |
| `payload.itemName` | `f_item_name` | `itemName` / `f_pick_name` |
| `payload.copy.bodyHtml` | `f_pick_msg` | `txt` / `f_pick_msg` |

---

## `goto` (legacy `scene`)

| V2 | Legacy hotspot | Legacy choice/reward |
|---|---|---|
| `type: "goto"` | `type: "scene"` | `actionType: "scene"` |
| `payload.target` | `f_target` | `target` / `f_target` |
| `payload.copy.bodyHtml` | `f_trans_txt` | `transTxt` / `f_trans_txt` |
| `payload.copy.buttonLabel` | `f_trans_btn` | `transBtn` / `f_trans_btn` |

---

## `req`

| V2 | Legacy hotspot | Legacy choice/reward |
|---|---|---|
| `type: "req"` | `type: "req"` | `actionType: "req"` |
| `payload.itemId` | `f_item_id` | `itemId` |
| `payload.copy.bodyHtml` (message KO) | `f_ko` | `ko` |
| `payload.rewardAction` | `f_req_action` + champs associés | `f_req_action` + payload reward |

### Détails `rewardAction` (`req`/`pwd`)

Le reward legacy dépend du type enfant :

- Reward `goto`/`scene` : `f_target`, `f_trans_txt`, `f_trans_btn`
- Reward `msg` : `f_ok_msg`
- Reward `pick` : `f_pick_id`, `f_pick_name`, `f_pick_msg`
- Reward `selector` :
  - `f_reward_sel_title`
  - `f_reward_sel_intro`
  - `f_reward_sel_display`
  - `f_reward_sel_choices` (JSON)
- Reward imbriqué `req`/`pwd` :
  - `f_reward_chain_json` (JSON de chaîne)

---

## `pwd`

| V2 | Legacy hotspot | Legacy choice/reward |
|---|---|---|
| `type: "pwd"` | `type: "pwd"` | `actionType: "pwd"` |
| `payload.copy.bodyHtml` (énigme) | `f_enigme_txt` | `enigmeTxt` |
| `payload.answer` | `f_pwd` | `pwd` |
| `payload.rewardAction` | `f_pwd_action` + champs associés | `f_pwd_action` + payload reward |

> Les mappings reward sont les mêmes que pour `req` (bloc ci-dessus).

---

## `selector`

| V2 | Legacy hotspot | Legacy choice/reward |
|---|---|---|
| `type: "selector"` | `type: "selector"` | `actionType: "selector"` |
| `payload.nested.title` | `f_sel_title` | `nested.title` |
| `payload.nested.copy.bodyHtml` | `f_sel_intro` | `nested.introHtml` |
| `payload.nested.displayMode` (`buttons`/`dropdown`) | `f_sel_display` | `nested.displayMode` |
| `payload.nested.choices[]` | `f_sel_choices` (JSON) | `nested.choices[]` |

### Shape d’un choix selector (legacy JSON)

- `label`
- `actionType` (`msg`, `pick`, `scene`, `req`, `pwd`, `selector`)
- Champs selon type :
  - `txt` (`msg`)
  - `itemId`, `itemName`, `txt` (`pick`)
  - `target`, `transTxt`, `transBtn` (`scene`)
  - `itemId`, `ko`, `f_req_action`, ... (`req`)
  - `enigmeTxt`, `pwd`, `f_pwd_action`, ... (`pwd`)
  - `nested` (`selector`)

---

## Notes C7.3

- Pour les popups nodales, la source de vérité reste **V2/store nodal**.
- Le formulaire legacy sert d’interface de projection **Nodal -> DOM** vers le runtime actuel.
- Éviter les flux **DOM -> Nodal** dans les nouveaux écrans C7.3 (hors cas explicitement documentés).
