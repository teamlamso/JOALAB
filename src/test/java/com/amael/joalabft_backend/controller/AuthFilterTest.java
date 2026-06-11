package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.service.SessionStore;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Vérifie le comportement du filtre d'authentification — porte d'entrée
 * de la sécurité côté API. Toute régression silencieuse ici
 * (token mal validé, méthode oubliée, chemin de bypass non-intentionnel)
 * ouvrirait l'accès à l'ensemble des endpoints sans aucun signal.
 */
@ExtendWith(MockitoExtension.class)
class AuthFilterTest {

    @Mock SessionStore sessionStore;
    @Mock ContainerRequestContext ctx;
    @Mock UriInfo uriInfo;

    @InjectMocks AuthFilter filter;

    private final Utilisateur user = TestEntities.mcd(1);

    @BeforeEach
    void setUp() {
        // Stubbing partagé : la plupart des tests passent par UriInfo et
        // headers — on factorise sans forcer chaque test à les redéclarer.
        // `lenient()` évite les UnnecessaryStubbingException sur les branches
        // de bypass (login, OPTIONS) qui n'atteignent pas le UriInfo.
        lenient().when(ctx.getUriInfo()).thenReturn(uriInfo);
    }

    // ---------------------------------------------------------------------
    // Bypass : login et preflight CORS
    // ---------------------------------------------------------------------

    @Test
    void postAuthLogin_passe_sansToken() throws IOException {
        when(uriInfo.getPath()).thenReturn("auth/login");

        filter.filter(ctx);

        verify(ctx, never()).abortWith(any());
        verify(sessionStore, never()).getUtilisateur(any());
    }

    @Test
    void optionsPreflight_passe_sansToken() throws IOException {
        // Une requête OPTIONS sans token doit passer pour que le navigateur
        // puisse récupérer les en-têtes CORS avant la vraie requête.
        when(uriInfo.getPath()).thenReturn("clients");
        when(ctx.getMethod()).thenReturn("OPTIONS");

        filter.filter(ctx);

        verify(ctx, never()).abortWith(any());
    }

    @Test
    void optionsLogin_passe_aussi() throws IOException {
        // Combinaison OPTIONS + login : doit aussi passer.
        when(uriInfo.getPath()).thenReturn("auth/login");
        // getMethod n'est pas appelé car le chemin matche avant — on ne stubbe pas.

        filter.filter(ctx);

        verify(ctx, never()).abortWith(any());
    }

    // ---------------------------------------------------------------------
    // Token absent ou malformé → 401
    // ---------------------------------------------------------------------

    @Test
    void sansHeaderAuthorization_renvoie401() throws IOException {
        when(uriInfo.getPath()).thenReturn("clients");
        when(ctx.getMethod()).thenReturn("GET");
        when(ctx.getHeaderString("Authorization")).thenReturn(null);

        filter.filter(ctx);

        ArgumentCaptor<Response> cap = ArgumentCaptor.forClass(Response.class);
        verify(ctx).abortWith(cap.capture());
        assertThat(cap.getValue().getStatus()).isEqualTo(401);
    }

    @Test
    void headerSansPrefixeBearer_renvoie401() throws IOException {
        // Régression possible : un caller envoie « Token abc » au lieu de
        // « Bearer abc » et ça passerait silencieusement si on testait juste
        // la présence d'un header.
        when(uriInfo.getPath()).thenReturn("clients");
        when(ctx.getMethod()).thenReturn("GET");
        when(ctx.getHeaderString("Authorization")).thenReturn("Token abc123");

        filter.filter(ctx);

        verify(ctx).abortWith(any());
        verify(sessionStore, never()).getUtilisateur(any());
    }

    @Test
    void headerBearerVide_renvoie401() throws IOException {
        when(uriInfo.getPath()).thenReturn("clients");
        when(ctx.getMethod()).thenReturn("GET");
        when(ctx.getHeaderString("Authorization")).thenReturn("Bearer ");
        when(sessionStore.getUtilisateur("")).thenReturn(null);

        filter.filter(ctx);

        verify(ctx).abortWith(any());
    }

    // ---------------------------------------------------------------------
    // Token invalide → 401, le SessionStore est consulté
    // ---------------------------------------------------------------------

    @Test
    void tokenInconnu_renvoie401() throws IOException {
        when(uriInfo.getPath()).thenReturn("clients");
        when(ctx.getMethod()).thenReturn("GET");
        when(ctx.getHeaderString("Authorization")).thenReturn("Bearer invalide");
        when(sessionStore.getUtilisateur("invalide")).thenReturn(null);

        filter.filter(ctx);

        ArgumentCaptor<Response> cap = ArgumentCaptor.forClass(Response.class);
        verify(ctx).abortWith(cap.capture());
        Response r = cap.getValue();
        assertThat(r.getStatus()).isEqualTo(401);
        assertThat(r.getMediaType().toString()).isEqualTo("application/json");
        // Le payload contient un message lisible — important côté frontend
        // pour ne pas afficher juste « Erreur 401 ».
        assertThat(r.getEntity().toString()).contains("Token manquant ou invalide");
    }

    // ---------------------------------------------------------------------
    // Token valide → l'utilisateur est exposé via setProperty
    // ---------------------------------------------------------------------

    @Test
    void tokenValide_exposeUtilisateurEtTokenDansLeContexte() throws IOException {
        when(uriInfo.getPath()).thenReturn("clients/42");
        when(ctx.getMethod()).thenReturn("GET");
        when(ctx.getHeaderString("Authorization")).thenReturn("Bearer abc123");
        when(sessionStore.getUtilisateur("abc123")).thenReturn(user);

        filter.filter(ctx);

        // Aucun abort.
        verify(ctx, never()).abortWith(any());
        // Les ressources lisent ces deux propriétés via @Context ou directement
        // depuis le ContainerRequestContext — c'est notre contrat.
        verify(ctx).setProperty("utilisateur", user);
        verify(ctx).setProperty("token", "abc123");
    }

    @Test
    void tokenAvecEspaces_estTrim() throws IOException {
        // Garde-fou : une certaine variante de proxy ajoute parfois un espace
        // après le token. On doit le retirer avant lookup pour éviter un 401
        // qui paraîtrait inexplicable.
        when(uriInfo.getPath()).thenReturn("clients");
        when(ctx.getMethod()).thenReturn("GET");
        when(ctx.getHeaderString("Authorization")).thenReturn("Bearer  abc123  ");
        when(sessionStore.getUtilisateur("abc123")).thenReturn(user);

        filter.filter(ctx);

        verify(ctx, never()).abortWith(any());
        verify(sessionStore).getUtilisateur("abc123");
    }

    // ---------------------------------------------------------------------
    // Aucun chemin sensible ne doit ressembler à « auth/login » sans l'être
    // ---------------------------------------------------------------------

    @Test
    void cheminSeTerminantParAuthLogin_passe_documentationDuComportement() throws IOException {
        // Comportement actuel : `endsWith("auth/login")` matche aussi
        // un chemin imaginé « /api/admin/auth/login » qui se terminerait
        // ainsi. Ce test gèle ce comportement pour qu'un dev futur le
        // remarque s'il en introduit un (renaming en sous-route au lieu
        // de startsWith).
        when(uriInfo.getPath()).thenReturn("autre/auth/login");

        filter.filter(ctx);

        verify(ctx, never()).abortWith(any());
    }

    @Test
    void cheminSemblableAuthLogin_maisDifferent_estProtege() throws IOException {
        // /auth/login-anything ne doit PAS passer — c'est bien sûr le
        // comportement attendu, mais sans test on pourrait introduire un
        // startsWith par mégarde et ouvrir un bypass.
        when(uriInfo.getPath()).thenReturn("auth/login-public");
        when(ctx.getMethod()).thenReturn("POST");
        when(ctx.getHeaderString("Authorization")).thenReturn(null);

        filter.filter(ctx);

        verify(ctx).abortWith(any());
    }

    // ---------------------------------------------------------------------
    // Toutes les méthodes HTTP non-OPTIONS sont contrôlées
    // ---------------------------------------------------------------------

    @Test
    void methodesHttpNonOptions_sansToken_sontToutesRefusees() throws IOException {
        // Garde-fou paramétrique : si quelqu'un retire un cas de la
        // condition (ex : ajoute un bypass pour HEAD), le test casse.
        for (String methode : List.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD")) {
            ContainerRequestContext localCtx = org.mockito.Mockito.mock(ContainerRequestContext.class);
            UriInfo localUri = org.mockito.Mockito.mock(UriInfo.class);
            when(localCtx.getUriInfo()).thenReturn(localUri);
            when(localUri.getPath()).thenReturn("clients");
            when(localCtx.getMethod()).thenReturn(methode);
            when(localCtx.getHeaderString("Authorization")).thenReturn(null);

            filter.filter(localCtx);

            verify(localCtx).abortWith(any());
        }
    }
}
