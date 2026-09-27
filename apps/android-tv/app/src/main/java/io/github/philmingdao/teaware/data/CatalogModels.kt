package io.github.philmingdao.teaware.data

import kotlinx.serialization.Serializable

@Serializable
data class CatalogV1(
    val catalogVersion: String,
    val generatedAt: String,
    val itemCount: Int,
    val items: List<CatalogItem>
)

@Serializable
data class CatalogItem(
    val id: String,
    val titleChinese: String,
    val titleEnglish: String,
    val dynasty: String,
    val dynastyEnglish: String,
    val period: String? = null,
    val date: String,
    val material: String,
    val materialEnglish: String,
    val objectType: String,
    val objectTypeEnglish: String,
    val kiln: String? = null,
    val kilnEnglish: String? = null,
    val dimensions: String? = null,
    val description: String? = null,
    val sourceMuseum: String,
    val sourceMuseumEnglish: String,
    val accessionNumber: String,
    val sourceUrl: String,
    val imageUrl: String,
    val imageAlt: String,
    val license: String,
    val creditLine: String? = null,
    val thumbUrl: String,
    val posterUrl: String
) {
    fun getFullImageUrl(baseUrl: String): String {
        return if (imageUrl.startsWith("http")) imageUrl else "$baseUrl$imageUrl"
    }

    fun getFullThumbUrl(baseUrl: String): String {
        return if (thumbUrl.startsWith("http")) thumbUrl else "$baseUrl$thumbUrl"
    }

    fun getFullPosterUrl(baseUrl: String): String {
        return if (posterUrl.startsWith("http")) posterUrl else "$baseUrl$posterUrl"
    }
}
