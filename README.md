# Le Havre Marées 2026

Application web statique de consultation des horaires de marées du Havre pour 2026.

## Fonctionnalités

- Consultation jour par jour des pleines mers et basses mers.
- Hauteurs, heures et coefficients.
- Courbe estimative de la journée.
- Liste mensuelle autour de la date choisie.
- Vue "Grosses marées" avec filtre par coefficient et par mois.
- Installation possible sur iPhone via "Ajouter à l'écran d'accueil".

## Utilisation locale

Lancer un petit serveur web dans ce dossier, puis ouvrir l'adresse locale dans un navigateur.

```powershell
python -m http.server 8765
```

Puis ouvrir :

```text
http://127.0.0.1:8765/
```

## Note

Application personnelle de consultation. Les horaires et hauteurs affichés ne remplacent pas les documents officiels ni les consignes de sécurité en mer.
