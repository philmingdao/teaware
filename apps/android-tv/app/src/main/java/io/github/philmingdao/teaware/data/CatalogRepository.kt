package io.github.philmingdao.teaware.data

import io.github.philmingdao.teaware.BuildConfig
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

sealed class CatalogResult {
    data class Success(val catalog: CatalogV1) : CatalogResult()
    data class Error(val message: String, val exception: Throwable? = null) : CatalogResult()
    data object Loading : CatalogResult()
}

class CatalogRepository(
    private val baseUrl: String = BuildConfig.CATALOG_BASE_URL
) {
    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
            })
        }
    }

    val catalogUrl: String
        get() = "$baseUrl/catalog.v1.json"

    val imageBaseUrl: String
        get() = baseUrl

    suspend fun fetchCatalog(): CatalogResult {
        return try {
            val catalog: CatalogV1 = client.get(catalogUrl).body()
            CatalogResult.Success(catalog)
        } catch (e: Exception) {
            CatalogResult.Error(
                message = e.message ?: "Unknown error fetching catalog",
                exception = e
            )
        }
    }

    fun getItemsByDynasty(items: List<CatalogItem>, dynasty: String): List<CatalogItem> {
        return items.filter { it.dynasty == dynasty }
    }

    fun getItemsByMuseum(items: List<CatalogItem>, museum: String): List<CatalogItem> {
        return items.filter { it.sourceMuseum == museum || it.sourceMuseumEnglish == museum }
    }

    fun getDynasties(items: List<CatalogItem>): List<String> {
        return items.map { it.dynasty }.distinct()
    }

    fun getMuseums(items: List<CatalogItem>): List<String> {
        return items.map { it.sourceMuseum }.distinct()
    }

    fun close() {
        client.close()
    }
}
