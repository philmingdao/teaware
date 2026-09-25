package io.github.philmingdao.teaware.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.material3.*
import io.github.philmingdao.teaware.data.CatalogItem

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun CategoryRow(
    title: String,
    items: List<CatalogItem>,
    baseUrl: String,
    onItemClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall,
            color = Color(0xFFC4A77D),
            modifier = Modifier.padding(start = 48.dp)
        )

        TvLazyRow(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            itemsIndexed(
                items = items,
                key = { _, item -> item.id }
            ) { index, item ->
                ArtworkCard(
                    item = item,
                    baseUrl = baseUrl,
                    onClick = { onItemClick(index) }
                )
            }
        }
    }
}
