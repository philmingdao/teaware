package io.github.philmingdao.teaware.ui.slideshow

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest
import io.github.philmingdao.teaware.data.CatalogItem

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SlideshowScreen(
    items: List<CatalogItem>,
    startIndex: Int,
    baseUrl: String,
    onDetailClick: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var currentIndex by remember { mutableIntStateOf(startIndex.coerceIn(0, items.lastIndex)) }
    val currentItem = items.getOrNull(currentIndex)
    val focusRequester = remember { FocusRequester() }
    val context = LocalContext.current

    LaunchedEffect(currentIndex) {
        val preloadRange = -5..5
        preloadRange.forEach { offset ->
            val idx = currentIndex + offset
            if (idx in items.indices && idx != currentIndex) {
                val preloadUrl = items[idx].getFullPosterUrl(baseUrl)
                val request = ImageRequest.Builder(context)
                    .data(preloadUrl)
                    .build()
                context.imageLoader.enqueue(request)
            }
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(focusRequester)
            .focusable()
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown) {
                    when (event.key) {
                        Key.DirectionLeft, Key.MediaRewind -> {
                            if (currentIndex > 0) currentIndex--
                            true
                        }
                        Key.DirectionRight, Key.MediaFastForward -> {
                            if (currentIndex < items.lastIndex) currentIndex++
                            true
                        }
                        Key.Enter, Key.DirectionCenter -> {
                            currentItem?.let { onDetailClick(it.id) }
                            true
                        }
                        Key.Back, Key.Escape -> {
                            onBack()
                            true
                        }
                        else -> false
                    }
                } else false
            }
    ) {
        currentItem?.let { item ->
            AnimatedContent(
                targetState = item,
                transitionSpec = {
                    fadeIn(animationSpec = androidx.compose.animation.core.tween(300)) togetherWith
                    fadeOut(animationSpec = androidx.compose.animation.core.tween(300))
                },
                label = "slideshow"
            ) { displayItem ->
                Box(modifier = Modifier.fillMaxSize()) {
                    AsyncImage(
                        model = displayItem.getFullPosterUrl(baseUrl),
                        contentDescription = displayItem.imageAlt,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(48.dp)
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.BottomCenter)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.8f)
                                    )
                                )
                            )
                            .padding(48.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = displayItem.titleChinese,
                                style = MaterialTheme.typography.headlineMedium,
                                color = Color.White
                            )
                            Text(
                                text = displayItem.titleEnglish,
                                style = MaterialTheme.typography.titleMedium,
                                color = Color(0xFFB3B3B3)
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Text(
                                    text = "${displayItem.dynasty} · ${displayItem.dynastyEnglish}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color(0xFFC4A77D)
                                )
                                Text(
                                    text = displayItem.date,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color(0xFF8B7355)
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(24.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "${currentIndex + 1} / ${items.size}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }

                    Column(
                        modifier = Modifier
                            .align(Alignment.CenterStart)
                            .padding(start = 16.dp)
                    ) {
                        if (currentIndex > 0) {
                            Text(
                                text = "◀",
                                style = MaterialTheme.typography.headlineLarge,
                                color = Color.White.copy(alpha = 0.5f)
                            )
                        }
                    }

                    Column(
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .padding(end = 16.dp)
                    ) {
                        if (currentIndex < items.lastIndex) {
                            Text(
                                text = "▶",
                                style = MaterialTheme.typography.headlineLarge,
                                color = Color.White.copy(alpha = 0.5f)
                            )
                        }
                    }

                    Text(
                        text = "← →  导航  |  OK 详情  |  Back 返回",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White.copy(alpha = 0.5f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 24.dp)
                    )
                }
            }
        }
    }
}
