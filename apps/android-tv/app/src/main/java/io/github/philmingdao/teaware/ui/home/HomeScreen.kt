package io.github.philmingdao.teaware.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.material3.*
import io.github.philmingdao.teaware.data.CatalogItem
import io.github.philmingdao.teaware.ui.components.CategoryRow

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeScreen(
    items: List<CatalogItem>,
    baseUrl: String,
    onItemClick: (Int) -> Unit,
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val featuredItems = remember(items) { items.take(20) }
    val songItems = remember(items) { items.filter { it.dynasty == "宋" }.take(15) }
    val mingItems = remember(items) { items.filter { it.dynasty == "明" }.take(15) }
    val qingItems = remember(items) { items.filter { it.dynasty == "清" }.take(15) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            HomeHeader(
                onSettingsClick = onSettingsClick,
                modifier = Modifier.padding(horizontal = 48.dp, vertical = 24.dp)
            )

            TvLazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(32.dp)
            ) {
                item {
                    CategoryRow(
                        title = "精选 Featured",
                        items = featuredItems,
                        baseUrl = baseUrl,
                        onItemClick = onItemClick
                    )
                }

                if (songItems.isNotEmpty()) {
                    item {
                        CategoryRow(
                            title = "宋代 Song Dynasty",
                            items = songItems,
                            baseUrl = baseUrl,
                            onItemClick = { index ->
                                val globalIndex = items.indexOf(songItems[index])
                                onItemClick(globalIndex)
                            }
                        )
                    }
                }

                if (mingItems.isNotEmpty()) {
                    item {
                        CategoryRow(
                            title = "明代 Ming Dynasty",
                            items = mingItems,
                            baseUrl = baseUrl,
                            onItemClick = { index ->
                                val globalIndex = items.indexOf(mingItems[index])
                                onItemClick(globalIndex)
                            }
                        )
                    }
                }

                if (qingItems.isNotEmpty()) {
                    item {
                        CategoryRow(
                            title = "清代 Qing Dynasty",
                            items = qingItems,
                            baseUrl = baseUrl,
                            onItemClick = { index ->
                                val globalIndex = items.indexOf(qingItems[index])
                                onItemClick(globalIndex)
                            }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HomeHeader(
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "器 · 茶",
                style = MaterialTheme.typography.displaySmall,
                color = Color(0xFFC4A77D)
            )
            Text(
                text = "Chinese Tea Ware Gallery",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFFB3B3B3)
            )
        }

        Button(
            onClick = onSettingsClick,
            colors = ButtonDefaults.colors(
                containerColor = Color(0xFF2A2A2A),
                focusedContainerColor = Color(0xFF3D3D3D)
            )
        ) {
            Text(
                text = "设置 Settings",
                color = Color.White
            )
        }
    }
}
