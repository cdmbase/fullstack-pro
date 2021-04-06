import React from "react"
import {StyleSheet, View, Text, ViewStyle} from "react-native"
import {Footer, Content} from "native-base"

interface Style {
    container: ViewStyle
}

const Hello = () => {
    return (
        <View style={styles.container}>
            <Content>
                <Text>Hello Value</Text>
            </Content>
            <Footer style={{position: 'absolute', left: 0, right: 0, bottom: 0}}>
                <View>
                    <Text>Footer will be here</Text>
                </View>
            </Footer>
        </View>
    )
}

const styles = StyleSheet.create<Style>({
    container: {
        flex: 1,
        textAlign: 'center'
    }
})

export default Hello