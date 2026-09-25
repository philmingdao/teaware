package io.github.philmingdao.teaware.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.material3.*

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedLanguage by remember { mutableStateOf("双语 Bilingual") }
    var selectedInterval by remember { mutableStateOf("10秒 10s") }
    var bgmEnabled by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown && event.key == Key.Back) {
                    onBack()
                    true
                } else false
            }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(48.dp)
        ) {
            Text(
                text = "设置 Settings",
                style = MaterialTheme.typography.displaySmall,
                color = Color(0xFFC4A77D)
            )

            Spacer(modifier = Modifier.height(32.dp))

            TvLazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(focusRequester),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    SettingsItem(
                        title = "语言 Language",
                        value = selectedLanguage,
                        options = listOf("中文", "English", "双语 Bilingual"),
                        onSelect = { selectedLanguage = it }
                    )
                }

                item {
                    SettingsItem(
                        title = "自动播放间隔 Autoplay Interval",
                        value = selectedInterval,
                        options = listOf("5秒 5s", "10秒 10s", "15秒 15s", "30秒 30s", "关闭 Off"),
                        onSelect = { selectedInterval = it }
                    )
                }

                item {
                    SettingsToggle(
                        title = "背景音乐 Background Music",
                        enabled = bgmEnabled,
                        onToggle = { bgmEnabled = it }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    AboutSection()
                }
            }
        }

        Text(
            text = "Back 返回",
            style = MaterialTheme.typography.labelMedium,
            color = Color.White.copy(alpha = 0.5f),
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(24.dp)
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SettingsItem(
    title: String,
    value: String,
    options: List<String>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        onClick = { expanded = !expanded },
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.colors(
            containerColor = Color(0xFF2A2A2A),
            focusedContainerColor = Color(0xFF3D3D3D)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )
                Text(
                    text = value,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFFC4A77D)
                )
            }

            if (expanded) {
                Spacer(modifier = Modifier.height(16.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    options.forEach { option ->
                        Button(
                            onClick = {
                                onSelect(option)
                                expanded = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.colors(
                                containerColor = if (option == value) Color(0xFF8B7355)
                                                else Color(0xFF1E1E1E),
                                focusedContainerColor = Color(0xFFC4A77D)
                            )
                        ) {
                            Text(
                                text = option,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SettingsToggle(
    title: String,
    enabled: Boolean,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = { onToggle(!enabled) },
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.colors(
            containerColor = Color(0xFF2A2A2A),
            focusedContainerColor = Color(0xFF3D3D3D)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = Color.White
            )
            Text(
                text = if (enabled) "开 ON" else "关 OFF",
                style = MaterialTheme.typography.bodyMedium,
                color = if (enabled) Color(0xFF4CAF50) else Color(0xFF8B7355)
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun AboutSection(
    modifier: Modifier = Modifier
) {
    Card(
        onClick = { },
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.colors(
            containerColor = Color(0xFF2A2A2A),
            focusedContainerColor = Color(0xFF3D3D3D)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "关于 About",
                style = MaterialTheme.typography.titleMedium,
                color = Color.White
            )
            Text(
                text = "器 · 茶  v1.0.0",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFFC4A77D)
            )
            Text(
                text = "Chinese Tea Ware Gallery",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFFB3B3B3)
            )
            Text(
                text = "约 3,150 件开放授权茶具藏品\n~3,150 open-license teaware artworks",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF8B7355)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "philmingdao.github.io/teaware",
                style = MaterialTheme.typography.labelSmall,
                color = Color(0xFF666666)
            )
        }
    }
}
