package io.github.philmingdao.teaware.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import io.github.philmingdao.teaware.data.CatalogItem

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ArtworkCard(
    item: CatalogItem,
    baseUrl: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isFocused by remember { mutableStateOf(false) }

    Card(
        onClick = onClick,
        modifier = modifier
            .width(200.dp)
            .height(280.dp)
            .onFocusChanged { isFocused = it.isFocused },
        border = CardDefaults.border(
            focusedBorder = Border(
                border = BorderStroke(3.dp, Color(0xFFC4A77D)),
                shape = MaterialTheme.shapes.medium
            )
        ),
        colors = CardDefaults.colors(
            containerColor = Color(0xFF2A2A2A),
            focusedContainerColor = Color(0xFF3D3D3D)
        )
    ) {
        Column {
            AsyncImage(
                model = item.getFullThumbUrl(baseUrl),
                contentDescription = item.imageAlt,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = item.titleChinese,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = item.titleEnglish,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFB3B3B3),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${item.dynasty} · ${item.date}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF8B7355),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
