const fs = require('fs');
const http = require('http'); 
const url = require('url');

const port = 3000;
const dbFile = 'bdd.json'; 
let taches = []; // Tableau pour stocker les tâches
let nextId = 1; // ID de la prochaine tâche à ajouter

function ecrireTaches(taches) {
  fs.writeFileSync(dbFile, JSON.stringify(taches, null, 2)); // Utilisation de JSON.stringify pour formater le JSON avec une indentation de 2 espaces
}

function lireTaches() {
  const data = fs.readFileSync(dbFile);
  return JSON.parse(data);
}

function calculerNextId(taches) { // Fonction pour calculer le prochain ID à attribuer, notamment en cas de reboot du serveur
  if (taches.length === 0) return 1;
  return Math.max(...taches.map(t => t.id)) + 1;
}


const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const chemin = parsedUrl.pathname;
  const segments = chemin.split('/');


  // Définition de la route pour la page d'accueil
  if (req.method === 'GET' && chemin === '/') {
    fs.readFile('index.html', (err, data) => {
      if (err) {
        console.error(err);
        res.writeHead(500);
        res.end('Erreur serveur');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  }

  // Définition de la route pour récupérer toutes les tâches
  else if (req.method === 'GET' && chemin === '/taches') {
    const taches = lireTaches(); // Appel de la fonction lireTaches pour récupérer les tâches depuis la petite BDD
    res.writeHead(200, { 'Content-Type': 'application/json' }); // Envoi du code de statut 200 et du type de contenu JSON
    res.end(JSON.stringify(taches));
  }

  // Définition de la route pour ajouter une nouvelle tâche
  else if (req.method === 'POST' && chemin === '/taches') { 
    let body = ''; // Initialisation de la variable pour stocker le corps de la requête
    req.on('data', chunk => { // Découpage des données reçues en morceaux
      body += chunk.toString(); // Conversion des morceaux en chaîne de caractères et ajout à la variable body
    });
    req.on('end', () => {
      const { titre, description } = JSON.parse(body);
      const taches = lireTaches(); 
      nextId = calculerNextId(taches); // Calcul du prochain ID à attribuer
      const nouvelleTache = { id: nextId++, titre, description }; // On génère un nouvel ID pour la tâche
      taches.push(nouvelleTache); // Ajout de la nouvelle tâche au tableau taches
      ecrireTaches(taches);
      res.writeHead(201); // Le code de statut 201 indique alors que la ressource a été créée avec succès
      res.end(JSON.stringify(nouvelleTache));
    });
  }
  

  // Définition de la route pour mettre à jour une tâche existante
  else if (req.method === 'PUT' && segments[1] === 'taches' && segments[2]) {  // Vérification de la méthode PUT et de l'URL
    let body = ''; // Le corps de la requête est initialisé avec une chaîne vide
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const id = parseInt(segments[2]);
      const { titre, description } = JSON.parse(body); // Récupération des données envoyées dans le corps de la requête
      const taches = lireTaches(); // Lire les tâches depuis le fichier
      const tache = taches.find(t => t.id === id); // Recherche de la tâche à mettre à jour dans le tableau taches
      
      if (!tache) { // Si la tâche n'existe pas, on renvoie une erreur 404
        res.writeHead(404);
        res.end(JSON.stringify({ message: 'Tâche non trouvée' }));
        return;
      }

      tache.titre = titre ?? tache.titre; // Utilisation de l'opérateur nullish coalescing (??) pour ne pas écraser la valeur existante si le titre est indéfini
      tache.description = description ?? tache.description; // Même logique pour la description

      ecrireTaches(taches); // Écrire les tâches mises à jour dans le fichier
      res.writeHead(200);
      res.end(JSON.stringify(tache));
    });
  }

  // DELETE /taches/:id
  else if (req.method === 'DELETE' && segments[1] === 'taches' && segments[2]) {
    const id = parseInt(segments[2]);
    const taches = lireTaches();
    const index = taches.findIndex(t => t.id === id);

    if (index === -1) {
      res.writeHead(404);
      res.end(JSON.stringify({ message: 'Tâche non trouvée' }));
      return;
    }

    taches.splice(index, 1); // La fonction splice permet de supprimer un élément du tableau à l'index spécifié
    ecrireTaches(taches); // Écrire les tâches mises à jour dans le fichier
    res.writeHead(204);
    res.end();
  }

  else {
    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Route non trouvée' }));
  }
});

server.listen(3000, () => {
  console.log('Serveur en écoute sur http://localhost:3000');
});
