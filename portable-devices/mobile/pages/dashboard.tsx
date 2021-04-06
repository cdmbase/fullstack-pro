import React from "react"
import {StyleSheet, View, Text, ViewStyle} from "react-native"
import { Link } from 'react-router-dom';
interface Style {
    container: ViewStyle
}

const Dashboard = () => {
    return(
        <View style={styles.container}>
            <Text>Dashboard Value</Text>
            <Link to={'/org'}>Calendar</Link>
        </View>
    )
}

const styles = StyleSheet.create<Style>({
    container:{
        textAlign: 'center'
    }
})

export default Dashboard